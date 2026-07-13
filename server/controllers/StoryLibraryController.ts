/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from "express";
import { storyLibraryService } from "../services/StoryLibraryService.js";
import { storageService } from "../services/StorageService.js";
import { geminiProvider } from "../providers/GeminiProvider.js";
import { openaiProvider } from "../providers/OpenAIProvider.js";
import { db } from "../database/db.js";
import { IllustrationStyle } from "../../src/types.js";

export class StoryLibraryController {
  /**
   * Lists all filesystem-authored story library entries
   */
  public listStories = async (req: Request, res: Response): Promise<void> => {
    try {
      const stories = storyLibraryService.listStories();
      res.status(200).json(stories);
    } catch (error: any) {
      console.error("[StoryLibraryController] Error listing stories:", error);
      res.status(500).json({ error: "Failed to list story library: " + error.message });
    }
  };

  /**
   * Retrieves a single story library entry with its chapters and character roster
   */
  public getStory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const story = storyLibraryService.getStory(id);
      if (!story) {
        res.status(404).json({ error: "Story library entry not found." });
        return;
      }
      res.status(200).json(story);
    } catch (error: any) {
      console.error("[StoryLibraryController] Error fetching story:", error);
      res.status(500).json({ error: "Failed to fetch story library entry: " + error.message });
    }
  };

  /**
   * Streams a character reference sheet image directly from disk
   */
  public getCharacterImage = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, key } = req.params;
      // Cloud-first: cast reference images live in GCS (casts/<id>/<key>.*).
      const gcsPath = await storyLibraryService.getCharacterGcsPath(id, key);
      if (gcsPath) {
        await storageService.streamTo(gcsPath, res);
        return;
      }
      const filePath = storyLibraryService.getCharacterImagePath(id, key);
      if (!filePath) {
        res.status(404).json({ error: "Character reference image not found." });
        return;
      }
      res.sendFile(filePath);
    } catch (error: any) {
      console.error("[StoryLibraryController] Error streaming character image:", error);
      res.status(500).json({ error: "Failed to load character image: " + error.message });
    }
  };

  /**
   * Streams a chapter's cached illustration directly from disk (server/stories/<id>/illustrations/)
   */
  public getChapterIllustration = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, pageNumber } = req.params;
      const filePath = storyLibraryService.getIllustrationPath(id, Number(pageNumber));
      if (!filePath) {
        res.status(404).json({ error: "No cached illustration found for this chapter yet." });
        return;
      }
      res.sendFile(filePath);
    } catch (error: any) {
      console.error("[StoryLibraryController] Error streaming chapter illustration:", error);
      res.status(500).json({ error: "Failed to load chapter illustration: " + error.message });
    }
  };

  /**
   * Generates (or regenerates) a chapter's illustration directly against the story template,
   * conditioned on its referenced characters' reference sheets, and caches it to disk.
   * Used from the Story Library browser so illustrations can be prepared/fixed before any
   * personalized book is created.
   */
  public regenerateChapterIllustration = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, pageNumber } = req.params;
      const story = storyLibraryService.getStory(id);
      if (!story) {
        res.status(404).json({ error: "Story library entry not found." });
        return;
      }

      const chapter = story.chapters.find((c) => c.pageNumber === Number(pageNumber));
      if (!chapter) {
        res.status(404).json({ error: "Chapter not found." });
        return;
      }

      const referenceImages = (await Promise.all(
        chapter.characterKeys.map((key) => storyLibraryService.getCharacterImageBase64(id, key))
      )).filter((ref): ref is { mime: string; data: string } => !!ref);

      const style = (req.body?.style as IllustrationStyle) || IllustrationStyle.STORYBOOK;
      const imageProvider = db.settings?.imageProvider || "gemini";

      const imageUrl = imageProvider === "openai"
        ? await openaiProvider.generateImageWithReferences(chapter.illustrationPrompt, referenceImages)
        : (imageProvider === "procedural"
            ? geminiProvider.createProceduralIllustration(chapter.illustrationPrompt, style)
            : await geminiProvider.generateImageWithReferences(chapter.illustrationPrompt, referenceImages, style));

      storyLibraryService.saveIllustration(id, Number(pageNumber), imageUrl);

      res.status(200).json({ success: true, pageNumber: Number(pageNumber) });
    } catch (error: any) {
      console.error("[StoryLibraryController] Error regenerating chapter illustration:", error);
      res.status(500).json({ error: "Failed to regenerate chapter illustration: " + error.message });
    }
  };
}
