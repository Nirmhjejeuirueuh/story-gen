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
        chapters.push(this.parseChapterFile(path.join(chaptersDir, f), pageNumber));
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

  private parseChapterFile(filePath: string, pageNumber: number): StoryLibraryChapter {
    const raw = fs.readFileSync(filePath, "utf-8");
    const lines = raw.split(/\r?\n/);

    const charLineIdx = lines.findIndex((l) => /^(charators|characters)\s*:/i.test(l.trim()));

    if (charLineIdx === -1) {
      return { pageNumber, illustrationPrompt: raw.trim(), characterKeys: [] };
    }

    const illustrationPrompt = lines.slice(0, charLineIdx).join("\n").trim();
    const characterKeys = lines[charLineIdx]
      .replace(/^[^:]*:/, "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    return { pageNumber, illustrationPrompt, characterKeys };
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
