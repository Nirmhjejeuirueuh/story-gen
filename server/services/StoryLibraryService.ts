/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs";
import path from "path";
import { StoryLibraryEntry, StoryLibraryChapter, StoryLibraryCharacter } from "../../src/types.js";

const CHAPTERS_DIR_NAMES = ["chapters"];
const CHARACTERS_DIR_NAMES = ["charators", "characters"];

export class StoryLibraryService {
  private storiesRoot = path.join(process.cwd(), "server", "stories");

  /**
   * Lists all filesystem-authored story templates (chapters + illustration prompts + character sheets)
   */
  public listStories(): StoryLibraryEntry[] {
    if (!fs.existsSync(this.storiesRoot)) return [];

    return fs.readdirSync(this.storiesRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => this.getStory(d.name))
      .filter((s): s is StoryLibraryEntry => !!s)
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  /**
   * Loads a single story library entry, parsing its chapters and character roster
   */
  public getStory(id: string): StoryLibraryEntry | null {
    const storyDir = path.join(this.storiesRoot, id);
    if (!fs.existsSync(storyDir) || !fs.statSync(storyDir).isDirectory()) return null;

    const chaptersDir = this.findSubdir(storyDir, CHAPTERS_DIR_NAMES);
    const charsDir = this.findSubdir(storyDir, CHARACTERS_DIR_NAMES);

    const chapters: StoryLibraryChapter[] = [];
    if (chaptersDir) {
      const files = fs.readdirSync(chaptersDir).filter((f) => f.toLowerCase().endsWith(".md"));
      for (const f of files) {
        const pageNumber = parseInt(path.basename(f, path.extname(f)), 10);
        if (!Number.isFinite(pageNumber)) continue;
        const chapter = this.parseChapterFile(path.join(chaptersDir, f), pageNumber);
        chapter.hasIllustration = !!this.findIllustrationFile(id, pageNumber);
        chapters.push(chapter);
      }
      chapters.sort((a, b) => a.pageNumber - b.pageNumber);
    }

    const characters: StoryLibraryCharacter[] = [];
    if (charsDir) {
      const imgFiles = fs.readdirSync(charsDir).filter((f) => /\.(png|jpe?g)$/i.test(f));
      for (const f of imgFiles) {
        const key = path.basename(f, path.extname(f)).trim().toLowerCase();
        characters.push({ key, displayName: this.titleCase(key) });
      }
      characters.sort((a, b) => a.key.localeCompare(b.key));
    }

    return {
      id,
      title: this.deriveTitle(id),
      numberOfPages: chapters.length,
      characters,
      chapters
    };
  }

  /**
   * Reads a character reference sheet image as base64 for use as a generation reference
   */
  public getCharacterImageBase64(storyId: string, key: string): { mime: string; data: string } | null {
    const filePath = this.findCharacterFile(storyId, key);
    if (!filePath) return null;
    const buffer = fs.readFileSync(filePath);
    const mime = /\.jpe?g$/i.test(filePath) ? "image/jpeg" : "image/png";
    return { mime, data: buffer.toString("base64") };
  }

  /**
   * Resolves the on-disk path to a character reference sheet image (for direct file streaming)
   */
  public getCharacterImagePath(storyId: string, key: string): string | null {
    return this.findCharacterFile(storyId, key);
  }

  /**
   * Resolves the on-disk path to a chapter's cached illustration, if one has been generated
   */
  public getIllustrationPath(storyId: string, pageNumber: number): string | null {
    return this.findIllustrationFile(storyId, pageNumber);
  }

  /**
   * Persists a generated chapter illustration (data URI) to the story's own
   * `illustrations` folder on disk, e.g. server/stories/<storyId>/illustrations/3.png
   * Overwrites any previously cached illustration for that page (in any format).
   */
  public saveIllustration(storyId: string, pageNumber: number, dataUri: string): string | null {
    const storyDir = path.join(this.storiesRoot, storyId);
    if (!fs.existsSync(storyDir) || !fs.statSync(storyDir).isDirectory()) return null;

    const match = /^data:image\/([a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUri);
    if (!match) return null;

    const [, subtype, base64Data] = match;
    const ext = subtype === "svg+xml" ? "svg" : subtype === "jpeg" ? "jpg" : subtype;

    const illustrationsDir = path.join(storyDir, "illustrations");
    if (!fs.existsSync(illustrationsDir)) {
      fs.mkdirSync(illustrationsDir, { recursive: true });
    }

    // Remove any stale cached copy in a different format before writing the fresh one
    const existing = this.findIllustrationFile(storyId, pageNumber);
    if (existing && path.basename(existing) !== `${pageNumber}.${ext}`) {
      fs.unlinkSync(existing);
    }

    const filePath = path.join(illustrationsDir, `${pageNumber}.${ext}`);
    fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));
    return filePath;
  }

  private findIllustrationFile(storyId: string, pageNumber: number): string | null {
    const illustrationsDir = path.join(this.storiesRoot, storyId, "illustrations");
    if (!fs.existsSync(illustrationsDir)) return null;

    const files = fs.readdirSync(illustrationsDir).filter((f) => /\.(png|jpe?g|svg)$/i.test(f));
    const match = files.find((f) => path.basename(f, path.extname(f)) === String(pageNumber));
    return match ? path.join(illustrationsDir, match) : null;
  }

  private findCharacterFile(storyId: string, key: string): string | null {
    const storyDir = path.join(this.storiesRoot, storyId);
    const charsDir = this.findSubdir(storyDir, CHARACTERS_DIR_NAMES);
    if (!charsDir) return null;

    const normalizedKey = key.trim().toLowerCase();
    const files = fs.readdirSync(charsDir).filter((f) => /\.(png|jpe?g)$/i.test(f));
    const match = files.find((f) => path.basename(f, path.extname(f)).trim().toLowerCase() === normalizedKey);
    return match ? path.join(charsDir, match) : null;
  }

  private findSubdir(parent: string, candidates: string[]): string | null {
    const entries = fs.readdirSync(parent, { withFileTypes: true }).filter((d) => d.isDirectory());
    for (const candidate of candidates) {
      const match = entries.find((e) => e.name.toLowerCase() === candidate);
      if (match) return path.join(parent, match.name);
    }
    return null;
  }

  /**
   * Parses a chapter file. Supports the labeled format:
   *   Story: <narrative text>
   *
   *   Illustration: <image generation prompt>
   *
   *   Charators: alice, white rabbit
   *
   * For backward compatibility, files with no "Story:"/"Illustration:" labels are treated
   * as a bare illustration prompt (everything before the Charators line), with no story text.
   */
  private parseChapterFile(filePath: string, pageNumber: number): StoryLibraryChapter {
    const raw = fs.readFileSync(filePath, "utf-8");
    const lines = raw.split(/\r?\n/);

    const charLineIdx = lines.findIndex((l) => /^(charators|characters)\s*:/i.test(l.trim()));
    const bodyLines = charLineIdx === -1 ? lines : lines.slice(0, charLineIdx);
    const characterKeys = charLineIdx === -1
      ? []
      : lines[charLineIdx]
          .replace(/^[^:]*:/, "")
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);

    const storyLineIdx = bodyLines.findIndex((l) => /^story(\s*text)?\s*:/i.test(l.trim()));
    const illustrationLineIdx = bodyLines.findIndex((l) => /^illustration(\s*prompt)?\s*:/i.test(l.trim()));

    let storyText = "";
    let illustrationPrompt: string;

    if (illustrationLineIdx !== -1) {
      if (storyLineIdx !== -1) {
        storyText = [
          bodyLines[storyLineIdx].replace(/^story(\s*text)?\s*:/i, "").trim(),
          ...bodyLines.slice(storyLineIdx + 1, illustrationLineIdx)
        ].join("\n").trim();
      }
      illustrationPrompt = [
        bodyLines[illustrationLineIdx].replace(/^illustration(\s*prompt)?\s*:/i, "").trim(),
        ...bodyLines.slice(illustrationLineIdx + 1)
      ].join("\n").trim();
    } else {
      illustrationPrompt = bodyLines.join("\n").trim();
    }

    return { pageNumber, storyText, illustrationPrompt, characterKeys };
  }

  private deriveTitle(id: string): string {
    const withoutPrefix = id.replace(/^t\d+-/i, "");
    return this.titleCase(withoutPrefix.replace(/-/g, " "));
  }

  private titleCase(text: string): string {
    return text.replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

export const storyLibraryService = new StoryLibraryService();
