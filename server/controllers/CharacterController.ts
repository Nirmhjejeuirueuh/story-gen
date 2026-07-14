/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from "express";
import { CharacterRepository } from "../repositories/CharacterRepository.js";
import { QueueService } from "../services/QueueService.js";
import { storageService } from "../services/StorageService.js";
import { JobType, Character } from "../../src/types.js";
import { AuthedRequest } from "../middleware/auth.js";

export class CharacterController {
  constructor(
    private characterRepo: CharacterRepository,
    private queueService: QueueService
  ) {}

  /**
   * Whether the caller may read/modify this character: the owner, or an admin for legacy
   * characters that predate per-user ownership (no ownerId).
   */
  private canAccessChar(char: Character, req: AuthedRequest): boolean {
    return char.ownerId === req.uid || (!!req.isAdmin && !char.ownerId);
  }

  /**
   * Creates a character profile and initiates official reference sheet generation in the background
   */
  public createCharacter = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        name,
        age,
        gender,
        description,
        photos,
        hairColor,
        hairStyle,
        eyeColor,
        skinTone,
        clothingStyle,
        accessories,
        personality,
        additionalNotes
      } = req.body;

      const charId = "char_" + Math.random().toString(36).substring(2, 11);

      // Upload reference photos to GCS and store their URLs instead of inline base64. Keeps
      // the DB small and puts every image in the cloud. resolveReference downloads these URLs
      // when they're used as generation references, so personalization is unaffected.
      const uploadedPhotos: string[] = [];
      for (let i = 0; i < (photos || []).length; i++) {
        uploadedPhotos.push(await storageService.uploadDataUri(photos[i], `photos/${charId}/${i}-${Date.now()}`));
      }

      const character: Character = {
        id: charId,
        ownerId: (req as AuthedRequest).uid,
        name,
        age,
        gender,
        description: description || "A happy, smiling little adventurer.",
        photos: uploadedPhotos,
        hairColor,
        hairStyle,
        eyeColor,
        skinTone,
        clothingStyle,
        accessories,
        personality,
        additionalNotes,
        createdAt: new Date().toISOString()
      };

      const saved = await this.characterRepo.create(character);
      console.log(`[CharacterController] Character profile saved: ${saved.id}. Queuing sheet...`);

      // Queue background job to generate official multi-pose character reference sheet
      const job = await this.queueService.addJob(JobType.CHARACTER_SHEET, {
        characterId: saved.id
      });

      res.status(201).json({
        message: "Character profile created and reference sheet generation queued.",
        character: saved,
        jobId: job.id
      });
    } catch (error: any) {
      console.error("[CharacterController] Error creating character:", error);
      res.status(500).json({ error: "Failed to create character: " + error.message });
    }
  };

  /**
   * Re-queues reference sheet generation for an existing character profile
   */
  public regenerateCharacterSheet = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params; // characterId
      const char = await this.characterRepo.findById(id);
      if (!char || !this.canAccessChar(char, req as AuthedRequest)) {
        res.status(404).json({ error: "Character profile not found." });
        return;
      }

      const job = await this.queueService.addJob(JobType.CHARACTER_SHEET, { characterId: id });

      res.status(202).json({
        message: "Character reference sheet regeneration queued.",
        jobId: job.id
      });
    } catch (error: any) {
      console.error("[CharacterController] Error regenerating sheet:", error);
      res.status(500).json({ error: "Failed to regenerate character sheet: " + error.message });
    }
  };

  /**
   * Retrieves a character's reference sheet
   */
  public getCharacterSheetByCharacterId = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params; // characterId
      const owner = await this.characterRepo.findById(id);
      if (!owner || !this.canAccessChar(owner, req as AuthedRequest)) {
        res.status(404).json({ error: "Character profile not found." });
        return;
      }

      const sheet = await this.characterRepo.findSheetByCharacterId(id);

      if (!sheet) {
        res.status(404).json({ error: "Character sheet not found for this profile. It may still be generating." });
        return;
      }

      res.status(200).json(sheet);
    } catch (error: any) {
      console.error("[CharacterController] Error fetching sheet:", error);
      res.status(500).json({ error: "Failed to retrieve character sheet: " + error.message });
    }
  };

  /**
   * Approves a character reference sheet
   */
  public approveCharacterSheet = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params; // sheetId
      const { approved } = req.body;

      const sheet = await this.characterRepo.findSheetById(id);
      const owner = sheet ? await this.characterRepo.findById(sheet.characterId) : null;
      if (!sheet || !owner || !this.canAccessChar(owner, req as AuthedRequest)) {
        res.status(404).json({ error: "Character sheet not found." });
        return;
      }

      const updated = await this.characterRepo.updateSheet(id, { approved: !!approved });
      if (!updated) {
        res.status(404).json({ error: "Character sheet not found." });
        return;
      }

      res.status(200).json({
        message: approved ? "Character sheet approved. You can now use this reference in stories!" : "Character sheet unapproved.",
        sheet: updated
      });
    } catch (error: any) {
      console.error("[CharacterController] Error approving sheet:", error);
      res.status(500).json({ error: "Failed to update sheet approval status: " + error.message });
    }
  };

  /**
   * Lists all character profiles
   */
  public getAllCharacters = async (req: Request, res: Response): Promise<void> => {
    try {
      const auth = req as AuthedRequest;
      const list = (await this.characterRepo.findAll()).filter((c) => this.canAccessChar(c, auth));
      res.status(200).json(list);
    } catch (error: any) {
      console.error("[CharacterController] Error fetching list:", error);
      res.status(500).json({ error: "Failed to list characters: " + error.message });
    }
  };

  /**
   * Retrieves specific character details
   */
  public getCharacterById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const char = await this.characterRepo.findById(id);
      if (!char || !this.canAccessChar(char, req as AuthedRequest)) {
        res.status(404).json({ error: "Character profile not found." });
        return;
      }
      res.status(200).json(char);
    } catch (error: any) {
      console.error("[CharacterController] Error fetching character:", error);
      res.status(500).json({ error: "Failed to retrieve character profile: " + error.message });
    }
  };

  /**
   * Deletes a character and associated reference sheet
   */
  public deleteCharacter = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const existing = await this.characterRepo.findById(id);
      if (!existing || !this.canAccessChar(existing, req as AuthedRequest)) {
        res.status(404).json({ error: "Character profile not found." });
        return;
      }
      const deleted = await this.characterRepo.delete(id);
      if (!deleted) {
        res.status(404).json({ error: "Character profile not found." });
        return;
      }
      res.status(200).json({ message: "Character profile and associated sheets deleted successfully." });
    } catch (error: any) {
      console.error("[CharacterController] Error deleting character:", error);
      res.status(500).json({ error: "Failed to delete character: " + error.message });
    }
  };
}
