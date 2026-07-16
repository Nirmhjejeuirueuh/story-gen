/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Character, CharacterSheet } from "../../src/types.js";
import { db } from "../database/db.js";

export class CharacterRepository {
  public async create(character: Character): Promise<Character> {
    db.characters.push(character);
    await db.upsert("characters", character.id, character);
    return character;
  }

  public async findById(id: string): Promise<Character | null> {
    const character = db.characters.find(c => c.id === id);
    return character || null;
  }

  public async findAll(): Promise<Character[]> {
    return [...db.characters];
  }

  public async delete(id: string): Promise<boolean> {
    const initialLength = db.characters.length;
    const sheetIds = db.characterSheets.filter(s => s.characterId === id).map(s => s.id);
    db.characters = db.characters.filter(c => c.id !== id);
    db.characterSheets = db.characterSheets.filter(s => s.characterId !== id);
    await db.remove("characters", id);
    await Promise.all(sheetIds.map(sid => db.remove("characterSheets", sid)));
    return db.characters.length < initialLength;
  }

  public async createSheet(sheet: CharacterSheet): Promise<CharacterSheet> {
    db.characterSheets.push(sheet);
    await db.upsert("characterSheets", sheet.id, sheet);

    // Update reference in character
    const char = db.characters.find(c => c.id === sheet.characterId);
    if (char) {
      char.characterSheetId = sheet.id;
      await db.upsert("characters", char.id, char);
    }

    return sheet;
  }

  public async findSheetById(id: string): Promise<CharacterSheet | null> {
    const sheet = db.characterSheets.find(s => s.id === id);
    return sheet || null;
  }

  public async findSheetByCharacterId(characterId: string): Promise<CharacterSheet | null> {
    const sheet = db.characterSheets.find(s => s.characterId === characterId);
    return sheet || null;
  }

  public async updateSheet(id: string, updates: Partial<CharacterSheet>): Promise<CharacterSheet | null> {
    const index = db.characterSheets.findIndex(s => s.id === id);
    if (index === -1) return null;

    db.characterSheets[index] = {
      ...db.characterSheets[index],
      ...updates
    };
    await db.upsert("characterSheets", id, db.characterSheets[index]);
    return db.characterSheets[index];
  }
}
