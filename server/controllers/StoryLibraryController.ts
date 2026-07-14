/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from "express";
import { storyLibraryService } from "../services/StoryLibraryService.js";
import { templateStore } from "../services/TemplateStore.js";
import { storageService } from "../services/StorageService.js";
import { geminiProvider } from "../providers/GeminiProvider.js";
import { openaiProvider } from "../providers/OpenAIProvider.js";
import { promptEngine } from "../providers/PromptEngine.js";
import { db } from "../database/db.js";
import { IllustrationStyle } from "../../src/types.js";

export class StoryLibraryController {
  /**
   * Lists all filesystem-authored story library entries
   */
  public listStories = async (req: Request, res: Response): Promise<void> => {
    try {
      // Firestore-first (P1 Slice 2), filesystem fallback when the cache is empty.
      const stories = templateStore.listStories() ?? storyLibraryService.listStories();
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
      const story = templateStore.getStory(id) ?? storyLibraryService.getStory(id);
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
   * Returns a single cast character's details — display name and its reference-sheet prompt
   * (from charators/<key>.md) — plus whether a reference image exists. Backs the cast preview
   * pop-up. The image itself is loaded separately via the public /characters/:key/image route.
   */
  public getCharacterDetail = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, key } = req.params;
      const story = storyLibraryService.getStory(id);
      if (!story) {
        res.status(404).json({ error: "Story library entry not found." });
        return;
      }
      const normalizedKey = key.trim().toLowerCase();
      const character = story.characters.find((c) => c.key === normalizedKey);
      if (!character) {
        res.status(404).json({ error: "Character not found in this story." });
        return;
      }

      // Firestore-first (P1): read the seeded character doc; fall back to the filesystem .md if
      // the doc isn't present yet, so this never regresses while the migration rolls out.
      const doc = await templateStore.getCharacter(id, normalizedKey);
      const prompt = doc?.prompt ?? storyLibraryService.getCharacterDescription(id, normalizedKey);

      const gcsPath = await storyLibraryService.getCharacterGcsPath(id, normalizedKey);
      const hasImage = !!gcsPath || !!storyLibraryService.getCharacterImagePath(id, normalizedKey);

      res.status(200).json({
        key: character.key,
        displayName: character.displayName,
        prompt,
        hasImage,
        displaySheetImageUrl: doc?.displaySheetImageUrl || null,
        source: doc ? "firestore" : "filesystem",
      });
    } catch (error: any) {
      console.error("[StoryLibraryController] Error fetching character detail:", error);
      res.status(500).json({ error: "Failed to fetch character detail: " + error.message });
    }
  };

  /**
   * Generates a full multi-view DISPLAY sheet for a cast character on demand (Slice 4),
   * conditioned on its existing clean single reference image so the poses match. Stores the
   * result to GCS and records its URL as displaySheetImageUrl; the single reference image
   * (sheetImageUrl) is left as-is and remains the actual generation reference for story pages.
   */
  public regenerateCastSheet = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, key } = req.params;
      const normalizedKey = key.trim().toLowerCase();

      const story = storyLibraryService.getStory(id);
      const character = story?.characters.find((c) => c.key === normalizedKey);
      if (!story || !character) {
        res.status(404).json({ error: "Character not found in this story." });
        return;
      }

      // The clean single image becomes the reference; the .md/Firestore prompt describes it.
      const reference = await storyLibraryService.getCharacterImageBase64(id, normalizedKey);
      const doc = await templateStore.getCharacter(id, normalizedKey);
      const description = doc?.prompt ?? storyLibraryService.getCharacterDescription(id, normalizedKey) ?? `The character "${character.displayName}".`;

      const prompt = promptEngine.generateCastSheetPrompt(character.displayName, description);
      const refImages = reference ? [reference] : [];
      const imageProvider = db.settings?.imageProvider || "gemini";

      const dataUri = imageProvider === "openai"
        ? await openaiProvider.generateImageWithReferences(prompt, refImages)
        : (imageProvider === "procedural"
            ? geminiProvider.createProceduralIllustration(prompt, IllustrationStyle.STORYBOOK)
            : await geminiProvider.generateImageWithReferences(prompt, refImages, IllustrationStyle.STORYBOOK));

      // Store under a "-sheet-" suffix so it is NOT picked up as the generation reference
      // (which is matched by the prefix "casts/<id>/<key>." — note the trailing dot).
      const displaySheetImageUrl = await storageService.uploadDataUri(dataUri, `casts/${id}/${normalizedKey}-sheet-${Date.now()}`);
      await templateStore.setCharacterDisplaySheet(id, normalizedKey, displaySheetImageUrl);

      res.status(200).json({ success: true, displaySheetImageUrl });
    } catch (error: any) {
      console.error("[StoryLibraryController] Error regenerating cast sheet:", error);
      res.status(500).json({ error: "Failed to generate character sheet: " + error.message });
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
