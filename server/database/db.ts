/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs";
import path from "path";
import { Character, CharacterSheet, Book, Job, StoryTemplate, SystemSettings } from "../../src/types.js";
import { DEFAULT_TEMPLATES } from "../config/config.js";

interface DatabaseSchema {
  characters: Character[];
  characterSheets: CharacterSheet[];
  books: Book[];
  jobs: Job[];
  templates: StoryTemplate[];
  settings: SystemSettings;
}

const DB_FILE_PATH = path.join(process.cwd(), "data_db.json");

class DatabaseEngine {
  private schema: DatabaseSchema = {
    characters: [],
    characterSheets: [],
    books: [],
    jobs: [],
    templates: [...DEFAULT_TEMPLATES],
    settings: {
      textProvider: "gemini",
      imageProvider: "gemini",
      geminiApiKey: "",
      openaiApiKey: "",
      openaiModel: "gpt-4o-mini",
      openaiImageModel: "gpt-image-1"
    }
  };

  constructor() {
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(DB_FILE_PATH)) {
        const data = fs.readFileSync(DB_FILE_PATH, "utf-8");
        const parsed = JSON.parse(data);
        this.schema = {
          characters: parsed.characters || [],
          characterSheets: parsed.characterSheets || [],
          books: parsed.books || [],
          jobs: parsed.jobs || [],
          templates: parsed.templates && parsed.templates.length > 0 ? parsed.templates : [...DEFAULT_TEMPLATES],
          settings: parsed.settings || {
            textProvider: "gemini",
            imageProvider: "gemini",
            geminiApiKey: "",
            openaiApiKey: "",
            openaiModel: "gpt-4o-mini",
            openaiImageModel: "gpt-image-1"
          }
        };
        console.log(`Database loaded successfully from ${DB_FILE_PATH}. Count: Books=${this.schema.books.length}, Characters=${this.schema.characters.length}`);
      } else {
        this.save();
      }
    } catch (error) {
      console.error("Failed to load database. Initializing with empty state.", error);
    }
  }

  public save() {
    try {
      const dir = path.dirname(DB_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(this.schema, null, 2), "utf-8");
    } catch (error) {
      console.error("Failed to save database state:", error);
    }
  }

  // Table accessors
  get settings() { return this.schema.settings; }
  set settings(val) { this.schema.settings = val; this.save(); }

  get characters() { return this.schema.characters; }
  set characters(val) { this.schema.characters = val; this.save(); }

  get characterSheets() { return this.schema.characterSheets; }
  set characterSheets(val) { this.schema.characterSheets = val; this.save(); }

  get books() { return this.schema.books; }
  set books(val) { this.schema.books = val; this.save(); }

  get jobs() { return this.schema.jobs; }
  set jobs(val) { this.schema.jobs = val; this.save(); }

  get templates() { return this.schema.templates; }
  set templates(val) { this.schema.templates = val; this.save(); }
}

export const db = new DatabaseEngine();
export type DatabaseInstance = DatabaseEngine;
