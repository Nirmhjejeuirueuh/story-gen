/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Firestore-backed Story Templates (P1 of the DB restructure).
 *
 * Mirrors the filesystem Story Library (server/stories/<id>/) into Firestore:
 *   storyTemplates/{id}
 *   storyTemplates/{id}/pages/{pageNumber}
 *   storyTemplates/{id}/characters/{key}
 *
 * This slice is intentionally NON-BREAKING: the filesystem library stays the source of truth
 * (and the seed source + fallback). Seeding runs once on startup when the collection is empty,
 * so existing behavior is unchanged while the data lands in Firestore. Read paths are cut over
 * incrementally (starting with the cast pop-up's prompt), always with a filesystem fallback.
 */

import { getFirestore } from "../database/firestore.js";
import { storyLibraryService } from "./StoryLibraryService.js";
import {
  StoryTemplateDoc, TemplatePageDoc, TemplateCharacterDoc, StoryLibraryEntry,
} from "../../src/types.js";

const STYLE_DEFAULT = "Storybook";

/** Firestore rejects `undefined`; a JSON round-trip drops undefined keys and keeps null. */
function clean<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export class TemplateStore {
  private db = getFirestore();

  // In-memory cache of the Firestore-backed templates (template doc + pages + characters),
  // mirroring db.ts's cache pattern so list/detail reads don't hit Firestore per request.
  // `hasIllustration` is intentionally NOT cached here — it lives in the image store and is
  // overlaid at read time. Empty cache => callers fall back to the filesystem library.
  private cache = new Map<string, { template: StoryTemplateDoc; pages: TemplatePageDoc[]; characters: TemplateCharacterDoc[] }>();
  private loaded = false;

  private col() {
    return this.db.collection("storyTemplates");
  }

  /**
   * Hydrates the in-memory cache from Firestore (template docs + their pages/characters
   * subcollections). Safe to call after seeding; leaves the cache empty on failure so reads
   * fall back to the filesystem.
   */
  async loadAll(): Promise<void> {
    try {
      const templates = await this.col().get();
      const next = new Map<string, { template: StoryTemplateDoc; pages: TemplatePageDoc[]; characters: TemplateCharacterDoc[] }>();
      await Promise.all(templates.docs.map(async (d) => {
        const template = d.data() as StoryTemplateDoc;
        const [pagesSnap, charsSnap] = await Promise.all([
          d.ref.collection("pages").get(),
          d.ref.collection("characters").get(),
        ]);
        const pages = pagesSnap.docs.map((p) => p.data() as TemplatePageDoc).sort((a, b) => a.pageNumber - b.pageNumber);
        const characters = charsSnap.docs.map((c) => c.data() as TemplateCharacterDoc).sort((a, b) => a.key.localeCompare(b.key));
        next.set(d.id, { template, pages, characters });
      }));
      this.cache = next;
      this.loaded = true;
      console.log(`[TemplateStore] Loaded ${next.size} story template(s) from Firestore into cache.`);
    } catch (error) {
      console.error("[TemplateStore] Failed to load templates from Firestore (will fall back to filesystem):", error);
      this.loaded = false;
    }
  }

  /** True when the Firestore cache holds at least one template (so it can back reads). */
  private hasCache(): boolean {
    return this.loaded && this.cache.size > 0;
  }

  /**
   * Builds a StoryLibraryEntry (frontend shape) from a cached template, overlaying each page's
   * live illustration-existence from the image store (which is not part of the template data).
   */
  private toEntry(entry: { template: StoryTemplateDoc; pages: TemplatePageDoc[]; characters: TemplateCharacterDoc[] }): StoryLibraryEntry {
    const { template, pages, characters } = entry;
    return {
      id: template.id,
      title: template.title,
      numberOfPages: template.pageCount,
      tags: template.tags || [],
      characters: characters.map((c) => ({ key: c.key, displayName: c.name })),
      chapters: pages.map((p) => ({
        pageNumber: p.pageNumber,
        storyText: p.storyText,
        illustrationPrompt: p.illustrationPrompt,
        characterKeys: p.characterKeys || [],
        hasIllustration: !!storyLibraryService.getIllustrationPath(template.id, p.pageNumber),
      })),
    };
  }

  /** Firestore-backed story list; null when the cache is empty (caller uses the filesystem). */
  listStories(): StoryLibraryEntry[] | null {
    if (!this.hasCache()) return null;
    return [...this.cache.values()].map((e) => this.toEntry(e)).sort((a, b) => a.id.localeCompare(b.id));
  }

  /** Firestore-backed single story; null when absent from cache (caller uses the filesystem). */
  getStory(id: string): StoryLibraryEntry | null {
    const entry = this.cache.get(id);
    return entry ? this.toEntry(entry) : null;
  }

  /**
   * Seeds storyTemplates + pages + characters subcollections from the filesystem library,
   * once, when the collection is empty. Idempotent and safe to call on every startup.
   */
  async seedFromFilesystem(): Promise<void> {
    try {
      const existing = await this.col().limit(1).get();
      if (!existing.empty) return; // already seeded

      const stories = storyLibraryService.listStories();
      if (stories.length === 0) return;

      const now = new Date().toISOString();
      let templateCount = 0;

      for (const story of stories) {
        // One batch per story keeps us well under Firestore's 500-op batch limit.
        const batch = this.db.batch();
        const storyRef = this.col().doc(story.id);

        const templateDoc: StoryTemplateDoc = {
          id: story.id,
          title: story.title,
          tags: story.tags || [],
          pageCount: story.numberOfPages,
          style: STYLE_DEFAULT,
          description: "",
          createdAt: now,
        };
        batch.set(storyRef, templateDoc);

        for (const chapter of story.chapters) {
          const pageDoc: TemplatePageDoc = {
            pageNumber: chapter.pageNumber,
            storyText: chapter.storyText || "",
            illustrationPrompt: chapter.illustrationPrompt || "",
            characterKeys: chapter.characterKeys || [],
          };
          batch.set(storyRef.collection("pages").doc(String(chapter.pageNumber)), pageDoc);
        }

        for (const character of story.characters) {
          const charDoc: TemplateCharacterDoc = {
            key: character.key,
            name: character.displayName,
            prompt: storyLibraryService.getCharacterDescription(story.id, character.key),
            sheetImageUrl: `/api/story-library/${story.id}/characters/${encodeURIComponent(character.key)}/image`,
            approved: true,
            createdAt: now,
          };
          batch.set(storyRef.collection("characters").doc(character.key), charDoc);
        }

        await batch.commit();
        templateCount++;
      }

      console.log(`[TemplateStore] Seeded ${templateCount} story template(s) into Firestore.`);
    } catch (error) {
      // Non-fatal: the filesystem library still works, so a seed failure must not block startup.
      console.error("[TemplateStore] Failed to seed story templates from filesystem:", error);
    }
  }

  /**
   * Adds any filesystem cast members that are missing from a template's `characters`
   * subcollection in Firestore, without touching characters that already exist there. Needed
   * because `seedFromFilesystem` only runs once (when the collection is first empty) — cast
   * members added to disk afterward otherwise never reach Firestore, and the frontend only ever
   * reads the Firestore-backed cache. Returns the keys that were newly added.
   */
  async syncMissingCharacters(storyId: string): Promise<string[]> {
    const story = storyLibraryService.getStory(storyId);
    if (!story) return [];

    const storyRef = this.col().doc(storyId);
    const existingSnap = await storyRef.collection("characters").get();
    const existingKeys = new Set(existingSnap.docs.map((d) => d.id));

    const missing = story.characters.filter((c) => !existingKeys.has(c.key));
    if (missing.length === 0) return [];

    const now = new Date().toISOString();
    const newDocs: TemplateCharacterDoc[] = missing.map((character) => ({
      key: character.key,
      name: character.displayName,
      prompt: storyLibraryService.getCharacterDescription(storyId, character.key),
      sheetImageUrl: `/api/story-library/${storyId}/characters/${encodeURIComponent(character.key)}/image`,
      approved: true,
      createdAt: now,
    }));

    const batch = this.db.batch();
    for (const charDoc of newDocs) {
      batch.set(storyRef.collection("characters").doc(charDoc.key), clean(charDoc));
    }
    await batch.commit();

    const entry = this.cache.get(storyId);
    if (entry) {
      entry.characters = [...entry.characters, ...newDocs].sort((a, b) => a.key.localeCompare(b.key));
    }

    return missing.map((c) => c.key);
  }

  /** Raw cast character docs for a template (with textOnlyNearHumans etc.), or null if not cached. */
  getCharacters(storyId: string): TemplateCharacterDoc[] | null {
    const entry = this.cache.get(storyId);
    return entry ? [...entry.characters] : null;
  }

  /**
   * Flags/unflags a cast character as "text-only near humans" — its reference photo is never
   * sent as an image-conditioning input on a page it shares with another character (only
   * described in the text prompt). See the field's doc comment in src/types.ts for why this
   * exists (a confirmed Gemini image-safety block on child + dangerous-animal reference photos
   * together, regardless of scene tone).
   */
  async setTextOnlyNearHumans(storyId: string, key: string, value: boolean): Promise<void> {
    const normalizedKey = key.trim().toLowerCase();
    await this.col().doc(storyId).collection("characters").doc(normalizedKey).set({ textOnlyNearHumans: value }, { merge: true });
    const entry = this.cache.get(storyId);
    const cached = entry?.characters.find((c) => c.key === normalizedKey);
    if (cached) cached.textOnlyNearHumans = value;
  }

  /**
   * Flags/unflags a human/child protagonist as "drop my own reference photo on pages I share
   * with a textOnlyNearHumans-flagged antagonist". See the field's doc comment in src/types.ts —
   * this downgrades a hard, deterministic Gemini image-safety block to a soft, retriable one.
   */
  async setDropReferenceNearAntagonist(storyId: string, key: string, value: boolean): Promise<void> {
    const normalizedKey = key.trim().toLowerCase();
    await this.col().doc(storyId).collection("characters").doc(normalizedKey).set({ dropReferenceNearAntagonist: value }, { merge: true });
    const entry = this.cache.get(storyId);
    const cached = entry?.characters.find((c) => c.key === normalizedKey);
    if (cached) cached.dropReferenceNearAntagonist = value;
  }

  /** Raw generated page docs for a template (with layoutId/imageUrl), or null if not cached. */
  getPages(storyId: string): TemplatePageDoc[] | null {
    const entry = this.cache.get(storyId);
    return entry ? [...entry.pages].sort((a, b) => a.pageNumber - b.pageNumber) : null;
  }

  /**
   * REDESIGN: replaces a template's `pages` subcollection with a freshly generated set (from
   * "Generate Pages"). Updates the template's pageCount + layoutPlanId and the in-memory cache.
   * Character sheets (the `characters` subcollection) are left untouched.
   */
  async writePages(storyId: string, pages: TemplatePageDoc[], layoutPlanId: string): Promise<void> {
    const storyRef = this.col().doc(storyId);
    const existing = await storyRef.collection("pages").get();
    const batch = this.db.batch();
    existing.docs.forEach((d) => batch.delete(d.ref));
    for (const page of pages) {
      batch.set(storyRef.collection("pages").doc(String(page.pageNumber)), clean(page));
    }
    batch.set(storyRef, { pageCount: pages.length, layoutPlanId }, { merge: true });
    await batch.commit();

    const entry = this.cache.get(storyId);
    if (entry) {
      entry.pages = [...pages].sort((a, b) => a.pageNumber - b.pageNumber);
      entry.template.pageCount = pages.length;
      entry.template.layoutPlanId = layoutPlanId;
    }
  }

  /** REDESIGN: merges a partial update into one generated page (edit text/prompt/layout/image). */
  async updatePage(storyId: string, pageNumber: number, patch: Partial<TemplatePageDoc>): Promise<TemplatePageDoc | null> {
    const storyRef = this.col().doc(storyId);
    await storyRef.collection("pages").doc(String(pageNumber)).set(clean(patch), { merge: true });
    const entry = this.cache.get(storyId);
    const cached = entry?.pages.find((p) => p.pageNumber === pageNumber);
    if (cached) Object.assign(cached, patch);
    return cached ?? null;
  }

  /** Reads a single cast character doc, or null if it isn't in Firestore (caller falls back). */
  async getCharacter(storyId: string, key: string): Promise<TemplateCharacterDoc | null> {
    try {
      const snap = await this.col().doc(storyId).collection("characters").doc(key.trim().toLowerCase()).get();
      return snap.exists ? (snap.data() as TemplateCharacterDoc) : null;
    } catch (error) {
      console.error("[TemplateStore] Failed to read character doc:", error);
      return null;
    }
  }

  /**
   * Stores a generated multi-view DISPLAY sheet URL on a cast character doc (Slice 4). Leaves
   * sheetImageUrl (the clean single generation reference) untouched. Updates the cache entry too.
   */
  async setCharacterDisplaySheet(storyId: string, key: string, displaySheetImageUrl: string): Promise<void> {
    const normalizedKey = key.trim().toLowerCase();
    await this.col().doc(storyId).collection("characters").doc(normalizedKey).set({ displaySheetImageUrl }, { merge: true });
    const entry = this.cache.get(storyId);
    const cached = entry?.characters.find((c) => c.key === normalizedKey);
    if (cached) cached.displaySheetImageUrl = displaySheetImageUrl;
  }
}

export const templateStore = new TemplateStore();
