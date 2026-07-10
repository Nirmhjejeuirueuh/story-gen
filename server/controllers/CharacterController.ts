/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from "express";
import { CharacterRepository } from "../repositories/CharacterRepository.js";
import { QueueService } from "../services/QueueService.js";
import { JobType, Character } from "../../src/types.js";

export class CharacterController {
  constructor(
    private characterRepo: CharacterRepository,
    private queueService: QueueService
  ) {}

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

      const character: Character = {
        id: "char_" + Math.random().toString(36).substring(2, 11),
        name,
        age,
        gender,
        description: description || "A happy, smiling little adventurer.",
        photos: photos || [],
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
      if (!char) {
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
      const list = await this.characterRepo.findAll();
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
      if (!char) {
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
