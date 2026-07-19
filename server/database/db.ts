/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs";
import path from "path";
import { Character, CharacterSheet, Book, Job, SystemSettings } from "../../src/types.js";
import { getFirestore } from "./firestore.js";

interface DatabaseSchema {
  characters: Character[];
  characterSheets: CharacterSheet[];
  books: Book[];
  jobs: Job[];
  settings: SystemSettings;
}

const DEFAULT_SETTINGS: SystemSettings = {
  textProvider: "gemini",
  imageProvider: "gemini",
  geminiApiKey: "",
  openaiApiKey: "",
  openaiModel: "gpt-4o-mini",
  openaiImageModel: "gpt-image-1",
};

const SETTINGS_DOC_ID = "app";
const LEGACY_JSON_PATH = path.join(process.cwd(), "data_db.json");

/** Firestore rejects `undefined`; round-tripping through JSON drops undefined fields. */
function clean<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Strips inline base64 image data (legacy pre-GCS content) so a document fits Firestore's
 * 1 MB limit. GCS URLs ("/api/images/...") and everything else are preserved. Used only when
 * migrating an old data_db.json; new content already stores small URLs.
 */
function stripBase64<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj, (_k, v) =>
    typeof v === "string" && v.startsWith("data:image") ? "" : v
  ));
}

/**
 * Firestore-backed data store with an in-memory cache.
 *
 * Reads are served synchronously from the cache (so existing sync access like `db.settings`
 * and `db.books` keeps working, and list/read endpoints cost no Firestore reads). Writes go
 * granularly to Firestore per document via upsert()/remove(). On startup init() hydrates the
 * cache from Firestore; on an empty database it seeds defaults and migrates a legacy
 * data_db.json if one is present.
 *
 * NOTE: because reads come from a per-instance cache, deploy with a single instance
 * (Cloud Run max-instances=1) so writes from one instance are always visible.
 */
class DatabaseEngine {
  private schema: DatabaseSchema = {
    characters: [],
    characterSheets: [],
    books: [],
    jobs: [],
    settings: { ...DEFAULT_SETTINGS },
  };
  private db = getFirestore();
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    const [chars, sheets, books, jobs, settingsDoc] = await Promise.all([
      this.db.collection("characters").get(),
      this.db.collection("characterSheets").get(),
      this.db.collection("books").get(),
      this.db.collection("jobs").get(),
      this.db.collection("settings").doc(SETTINGS_DOC_ID).get(),
    ]);

    this.schema.characters = chars.docs.map((d) => d.data() as Character);
    this.schema.characterSheets = sheets.docs.map((d) => d.data() as CharacterSheet);
    this.schema.books = books.docs.map((d) => d.data() as Book);
    this.schema.jobs = jobs.docs.map((d) => d.data() as Job);
    this.schema.settings = settingsDoc.exists ? (settingsDoc.data() as SystemSettings) : { ...DEFAULT_SETTINGS };

    const legacy = this.readLegacyJson();

    // First run: migrate an existing local data_db.json into Firestore so nothing is lost.
    if (chars.empty && sheets.empty && books.empty && jobs.empty) {
      await this.migrateLegacyJson(legacy);
    }
    if (!settingsDoc.exists) {
      // Carry over settings (API keys, provider choice) from the legacy DB if present.
      this.schema.settings = legacy?.settings ? { ...DEFAULT_SETTINGS, ...legacy.settings } : { ...DEFAULT_SETTINGS };
      await this.setSettings(this.schema.settings);
    }

    this.initialized = true;
    console.log(`Firestore DB ready. Books=${this.schema.books.length}, Characters=${this.schema.characters.length}, Jobs=${this.schema.jobs.length}`);
  }

  private readLegacyJson(): any | null {
    if (!fs.existsSync(LEGACY_JSON_PATH)) return null;
    try {
      return JSON.parse(fs.readFileSync(LEGACY_JSON_PATH, "utf-8"));
    } catch {
      return null;
    }
  }

  private async migrateLegacyJson(parsed: any | null): Promise<void> {
    if (!parsed) return;
    try {
      const writes: Promise<unknown>[] = [];
      // Strip legacy inline base64 so oversized docs fit Firestore's 1 MB limit.
      for (const c of parsed.characters || []) { const x = stripBase64(c); this.schema.characters.push(x); writes.push(this.upsert("characters", x.id, x)); }
      for (const s of parsed.characterSheets || []) { const x = stripBase64(s); this.schema.characterSheets.push(x); writes.push(this.upsert("characterSheets", x.id, x)); }
      for (const b of parsed.books || []) { const x = stripBase64(b); this.schema.books.push(x); writes.push(this.upsert("books", x.id, x)); }
      for (const j of parsed.jobs || []) { const x = stripBase64(j); this.schema.jobs.push(x); writes.push(this.upsert("jobs", x.id, x)); }
      await Promise.all(writes);
      console.log(`Migrated legacy data_db.json into Firestore (${writes.length} docs).`);
    } catch (err) {
      console.error("Legacy data_db.json migration failed:", err);
    }
  }

  /** Writes a single document into a collection (create or full update). */
  async upsert(collection: string, id: string, item: unknown): Promise<void> {
    await this.db.collection(collection).doc(id).set(clean(item));
  }

  /** Deletes a single document. */
  async remove(collection: string, id: string): Promise<void> {
    await this.db.collection(collection).doc(id).delete();
  }

  // Table accessors (cache-backed). Writes must additionally call upsert()/remove().
  get settings() { return this.schema.settings; }
  async setSettings(val: SystemSettings) {
    this.schema.settings = val;
    await this.upsert("settings", SETTINGS_DOC_ID, val);
  }

  get characters() { return this.schema.characters; }
  set characters(val) { this.schema.characters = val; }

  get characterSheets() { return this.schema.characterSheets; }
  set characterSheets(val) { this.schema.characterSheets = val; }

  get books() { return this.schema.books; }
  set books(val) { this.schema.books = val; }

  get jobs() { return this.schema.jobs; }
  set jobs(val) { this.schema.jobs = val; }
}

export const db = new DatabaseEngine();
export type DatabaseInstance = DatabaseEngine;
