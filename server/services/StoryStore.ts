/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Firestore-backed generated Stories (P1 Slice 3 of the DB restructure).
 *
 * Target structure, mirrored from the legacy `books` collection:
 *   stories/{id}                    metadata + characterMap
 *   stories/{id}/pages/{pageNumber} texts{} multi-language + per-page status
 *   stories/{id}/characters/{charId}
 *   stories/{id}/generation/status
 *
 * Migration stance (Slice 3b/3c):
 *  - `books` stays the WRITE-PRIMARY (BookRepository) + authoritative cache, so the hot
 *    generation path is untouched and can't regress.
 *  - Every book mutation DUAL-WRITES here (syncBook / updatePage), keeping stories/ live.
 *  - READS are cut over to this model: the API assembles Book-shaped responses from an
 *    in-memory cache hydrated from stories/ on startup and kept fresh by the dual-write, so
 *    there is no per-request Firestore cost. getBook/listBooks fall back to null so callers
 *    can defensively use BookRepository if a story is somehow absent.
 * All dual-write calls are wrapped non-fatally by callers so a mirror failure never breaks the
 * primary flow.
 */

import { getFirestore } from "../database/firestore.js";
import { db } from "../database/db.js";
import { templateStore } from "./TemplateStore.js";
import {
  Book, BookPage, StoryDoc, StoryPageDoc, StoryCharacterDoc, GenerationStatusDoc,
} from "../../src/types.js";

/** Firestore rejects `undefined`; JSON round-trip drops undefined and keeps null. */
function clean<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

const roleOf = (key: string) => key.trim().toUpperCase().replace(/\s+/g, "_");
const titleCase = (text: string) => text.replace(/\b\w/g, (c) => c.toUpperCase());

export class StoryStore {
  private db = getFirestore();

  // In-memory cache of the stories/ model, assembled back into the Book shape the API/frontend
  // expect. Hydrated from Firestore on startup, then kept in sync by every dual-write.
  private cache = new Map<string, Book>();

  private col() {
    return this.db.collection("stories");
  }

  private storyRef(id: string) {
    return this.col().doc(id);
  }

  // --- Startup ---------------------------------------------------------------

  /** Mirrors every cached book into stories/ (idempotent: re-mirrors only when missing/stale). */
  async mirrorAll(): Promise<void> {
    try {
      let mirrored = 0;
      for (const book of db.books) {
        const ref = this.storyRef(book.id);
        const snap = await ref.get();
        // Re-mirror when absent, or when an older mirror predates the compat fields.
        if (snap.exists && (snap.data() as StoryDoc).childName !== undefined) continue;
        await this.writeBook(book);
        mirrored++;
      }
      if (mirrored) console.log(`[StoryStore] Mirrored ${mirrored} book(s) into stories/.`);
    } catch (error) {
      console.error("[StoryStore] Failed to mirror books into stories/:", error);
    }
  }

  /** Hydrates the read cache from Firestore stories/ (metadata + pages), assembled as Books. */
  async hydrateCache(): Promise<void> {
    try {
      const stories = await this.col().get();
      const next = new Map<string, Book>();
      await Promise.all(stories.docs.map(async (d) => {
        const meta = d.data() as StoryDoc;
        const pagesSnap = await d.ref.collection("pages").get();
        const pages = pagesSnap.docs.map((p) => p.data() as StoryPageDoc);
        next.set(d.id, this.assembleBook(meta, pages));
      }));
      this.cache = next;
      console.log(`[StoryStore] Read cache hydrated from stories/ (${next.size} stories).`);
    } catch (error) {
      console.error("[StoryStore] Failed to hydrate stories/ read cache:", error);
    }
  }

  // --- Reads (served from the stories/ model) --------------------------------

  /** A single story as a Book, or null if absent (caller may fall back to BookRepository). */
  getBook(id: string): Book | null {
    return this.cache.get(id) ?? null;
  }

  /** All stories as Books. Empty array means the cache isn't populated (caller falls back). */
  listBooks(): Book[] {
    return [...this.cache.values()];
  }

  // --- Dual-write ------------------------------------------------------------

  /** Full sync of a book into stories/ + cache. Load-by-id convenience for call sites. */
  async syncBook(bookId: string): Promise<void> {
    const book = db.books.find((b) => b.id === bookId);
    if (!book) return;
    await this.writeBook(book);
  }

  /**
   * Granular update of a single page's story doc + generation counters + cache — used on the
   * hot image-generation path so a page-status change doesn't rewrite the whole story.
   */
  async updatePage(bookId: string, pageNumber: number): Promise<void> {
    const book = db.books.find((b) => b.id === bookId);
    if (!book) return;
    const page = book.pages.find((p) => p.pageNumber === pageNumber);
    if (!page) return;

    await this.storyRef(bookId).collection("pages").doc(String(pageNumber)).set(clean(this.buildPage(page)));
    await this.storyRef(bookId).collection("generation").doc("status").set(clean(this.buildGeneration(book)));

    // Keep the read cache in step (fall back to a full assemble if this book isn't cached yet).
    const cached = this.cache.get(bookId);
    if (cached) {
      const idx = cached.pages.findIndex((p) => p.pageNumber === pageNumber);
      const assembledPage = this.pageDocToBookPage(this.buildPage(page), cached.createdAt);
      if (idx === -1) cached.pages.push(assembledPage);
      else cached.pages[idx] = assembledPage;
    } else {
      this.cache.set(bookId, this.bookToBook(book));
    }
  }

  /** Removes a story from stories/ + cache (called when its book is deleted). */
  async deleteStory(bookId: string): Promise<void> {
    try {
      this.cache.delete(bookId);
      const ref = this.storyRef(bookId);
      for (const sub of ["pages", "characters", "generation"]) {
        const snap = await ref.collection(sub).get();
        await Promise.all(snap.docs.map((d) => d.ref.delete()));
      }
      await ref.delete();
    } catch (error) {
      console.error("[StoryStore] Failed to delete story:", error);
    }
  }

  // --- Internal write --------------------------------------------------------

  /** Writes the full stories/{id} structure (upsert; replaces page/character subcollections). */
  private async writeBook(book: Book): Promise<void> {
    const ref = this.storyRef(book.id);
    const now = new Date().toISOString();

    const total = book.pages.length;
    const completed = book.pages.filter((p) => p.imageStatus === "Completed").length;
    const status: StoryDoc["status"] = total === 0 ? "draft" : completed === total ? "completed" : "generating";
    const { characters, characterMap } = await this.buildCharacters(book, now);

    const metadata: StoryDoc = {
      id: book.id,
      title: book.title,
      description: book.coverTitle || "",
      coverImageUrl: book.pages.find((p) => p.imageUrl)?.imageUrl || "",
      coverPrompt: "",
      style: book.style,
      language: ["en"],
      pageCount: total,
      status,
      templateId: book.templateId,
      libraryStoryId: book.libraryStoryId || null,
      createdBy: book.ownerId || null,
      characterMap,
      childName: book.childName || "",
      characterId: book.characterId || null,
      createdAt: book.createdAt || now,
      updatedAt: now,
    };

    // Replace subcollections cleanly: delete existing page/character docs, then rewrite.
    const [oldPages, oldChars] = await Promise.all([
      ref.collection("pages").get(),
      ref.collection("characters").get(),
    ]);
    const batch = this.db.batch();
    oldPages.docs.forEach((d) => batch.delete(d.ref));
    oldChars.docs.forEach((d) => batch.delete(d.ref));
    batch.set(ref, clean(metadata));
    for (const page of book.pages) batch.set(ref.collection("pages").doc(String(page.pageNumber)), clean(this.buildPage(page)));
    for (const character of characters) batch.set(ref.collection("characters").doc(character.id), clean(character));
    batch.set(ref.collection("generation").doc("status"), clean(this.buildGeneration(book)));
    await batch.commit();

    this.cache.set(book.id, this.bookToBook(book));
  }

  private buildGeneration(book: Book): GenerationStatusDoc {
    const total = book.pages.length;
    const completed = book.pages.filter((p) => p.imageStatus === "Completed").length;
    const anyPending = book.pages.some((p) => p.imageStatus === "Queued" || p.imageStatus === "Generating");
    return {
      characterSheetStatus: "completed",
      storyStatus: total > 0 ? "completed" : "pending",
      imagesStatus: total > 0 && completed === total ? "completed" : anyPending ? "running" : "pending",
      completedPages: completed,
      totalPages: total,
      pdfStatus: "pending",
    };
  }

  private buildPage(page: BookPage): StoryPageDoc {
    return {
      pageNumber: page.pageNumber,
      title: "",
      illustrationPrompt: page.illustrationPrompt || "",
      illustrationImageUrl: page.imageUrl || "",
      texts: { en: page.storyText || "" },
      characterIds: page.characterKeys || [],
      status: page.imageStatus,
      regeneratedCount: 0,
    };
  }

  private async buildCharacters(book: Book, now: string): Promise<{ characters: StoryCharacterDoc[]; characterMap: Record<string, string> }> {
    const characters: StoryCharacterDoc[] = [];
    const characterMap: Record<string, string> = {};

    if (book.characterId) {
      const hero = db.characters.find((c) => c.id === book.characterId);
      if (hero) {
        const sheetUrl = hero.characterSheetId
          ? db.characterSheets.find((s) => s.id === hero.characterSheetId)?.sheetImage || ""
          : "";
        characters.push({
          id: "main", role: "MAIN_CHARACTER", name: book.childName || hero.name, type: "custom",
          characterSheetImageUrl: sheetUrl, prompt: hero.description || null, approved: true,
          style: book.style, createdAt: hero.createdAt || now,
        });
        characterMap["MAIN_CHARACTER"] = "main";
      }
    }

    if (book.libraryStoryId) {
      const keys = new Set<string>();
      for (const page of book.pages) for (const key of page.characterKeys || []) keys.add(key);
      for (const key of keys) {
        const doc = await templateStore.getCharacter(book.libraryStoryId, key);
        characters.push({
          id: key, role: roleOf(key), name: doc?.name || titleCase(key), type: "template",
          characterSheetImageUrl: doc?.sheetImageUrl || `/api/story-library/${book.libraryStoryId}/characters/${encodeURIComponent(key)}/image`,
          prompt: doc?.prompt ?? null, approved: true, style: book.style, createdAt: now,
        });
        characterMap[roleOf(key)] = key;
      }
    }

    return { characters, characterMap };
  }

  // --- Assembly (stories/ model -> Book shape) -------------------------------

  private pageDocToBookPage(p: StoryPageDoc, createdAt: string): BookPage {
    return {
      id: `page_${p.pageNumber}`,
      pageNumber: p.pageNumber,
      storyText: p.texts?.en ?? "",
      texts: p.texts || { en: p.texts?.en ?? "" },
      illustrationPrompt: p.illustrationPrompt,
      characterKeys: p.characterIds || [],
      imageUrl: p.illustrationImageUrl || undefined,
      imageStatus: p.status,
      createdAt,
    };
  }

  private assembleBook(meta: StoryDoc, pages: StoryPageDoc[]): Book {
    return {
      id: meta.id,
      ownerId: meta.createdBy ?? undefined,
      title: meta.title,
      coverTitle: meta.description,
      characterId: meta.characterId ?? undefined,
      templateId: meta.templateId,
      style: meta.style as Book["style"],
      childName: meta.childName,
      libraryStoryId: meta.libraryStoryId ?? undefined,
      pages: [...pages].sort((a, b) => a.pageNumber - b.pageNumber).map((p) => this.pageDocToBookPage(p, meta.createdAt)),
      createdAt: meta.createdAt,
    };
  }

  /** Assembles a Book (cache entry) directly from a source Book by round-tripping its pages. */
  private bookToBook(book: Book): Book {
    const createdAt = book.createdAt || new Date().toISOString();
    return {
      ...book,
      pages: book.pages.map((p) => this.pageDocToBookPage(this.buildPage(p), createdAt)),
    };
  }
}

export const storyStore = new StoryStore();
