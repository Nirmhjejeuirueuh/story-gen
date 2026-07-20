/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from "express";
import { storyLibraryService } from "../services/StoryLibraryService.js";
import { templateStore } from "../services/TemplateStore.js";
import { layoutPlanStore } from "../services/LayoutPlanStore.js";
import { storageService } from "../services/StorageService.js";
import { geminiProvider } from "../providers/GeminiProvider.js";
import { openaiProvider } from "../providers/OpenAIProvider.js";
import { promptEngine } from "../providers/PromptEngine.js";
import { db } from "../database/db.js";
import { IllustrationStyle, TemplatePageDoc } from "../../src/types.js";
import { DEFAULT_LAYOUT_PLAN_ID } from "../config/layouts.js";

export class StoryLibraryController {
  /** The catalogue of page layouts the AI/editor can choose from (served for the editor UI). */
  public listLayouts = async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json(layoutPlanStore.getLayouts());
  };

  /**
   * REDESIGN — "Generate Pages" core logic. For a story TEMPLATE, asks the text model to write,
   * per page: story text + a chosen layout + a scene illustration prompt + which cast appears.
   * Stores the result in storyTemplates/{id}/pages (replacing any existing pages). Does NOT
   * generate images — those are generated per page, on demand, afterwards. Extracted from the
   * HTTP handler so it can also be called internally (auto-generate on first book creation).
   */
  public async generatePagesForStory(id: string, requestedNumPages?: number): Promise<TemplatePageDoc[]> {
    const story = templateStore.getStory(id) ?? storyLibraryService.getStory(id);
    if (!story) throw new Error("Story library entry not found.");

    const numPages = requestedNumPages && requestedNumPages > 0 ? Math.min(requestedNumPages, 40) : story.numberOfPages || 20;
    const cast = story.characters.map((c) => ({ key: c.key, name: c.displayName }));
    const castKeys = new Set(cast.map((c) => c.key));

    const prompt = promptEngine.generatePagesPrompt(
      story.title,
      cast,
      numPages,
      layoutPlanStore.getLayouts().map((l) => ({ layoutId: l.layoutId, name: l.name }))
    );

    const textProvider = db.settings?.textProvider || "gemini";
    const jsonText = textProvider === "openai"
      ? await openaiProvider.generateText(prompt, "You are a specialized JSON children's picture-book writer.", true)
      : await geminiProvider.generateText(prompt, "You are a specialized JSON children's picture-book writer.", true);

    let parsed: any;
    try {
      parsed = JSON.parse(jsonText.replace(/```json/gi, "").replace(/```/g, "").trim());
    } catch {
      throw new Error("Page generation output was not valid JSON. Please try again.");
    }

    const pages: TemplatePageDoc[] = (parsed.pages || [])
      .map((p: any, i: number) => ({
        pageNumber: Number(p.pageNumber) || i + 1,
        storyText: String(p.storyText || "").trim(),
        illustrationPrompt: String(p.illustrationPrompt || "").trim(),
        // Keep only real cast keys the model returned; ignore anything it invented.
        characterKeys: Array.isArray(p.characterKeys)
          ? p.characterKeys.map((k: any) => String(k).trim().toLowerCase()).filter((k: string) => castKeys.has(k))
          : [],
        layoutId: layoutPlanStore.getLayoutById(Number(p.layoutId)).layoutId,
      }))
      .sort((a: TemplatePageDoc, b: TemplatePageDoc) => a.pageNumber - b.pageNumber);

    if (pages.length === 0) throw new Error("Page generation returned no pages. Please try again.");

    await templateStore.writePages(id, pages, DEFAULT_LAYOUT_PLAN_ID);
    return pages;
  }

  /**
   * Auto-generate on first use: returns a story's generated pages, generating them first if none
   * exist yet. Lets book creation work immediately without requiring an admin to run "Generate"
   * ahead of time.
   */
  public async ensurePagesGenerated(id: string): Promise<TemplatePageDoc[]> {
    const existing = templateStore.getPages(id);
    if (existing && existing.length > 0) return existing;
    return this.generatePagesForStory(id);
  }

  public generatePages = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const requested = Number(req.body?.numPages);
      const pages = await this.generatePagesForStory(id, Number.isFinite(requested) ? requested : undefined);
      res.status(200).json({ success: true, pages });
    } catch (error: any) {
      console.error("[StoryLibraryController] Error generating pages:", error);
      const status = /not found/i.test(error.message) ? 404 : (/valid JSON|no pages/i.test(error.message) ? 502 : 500);
      res.status(status).json({ error: error.message || "Failed to generate pages." });
    }
  };

  /** Returns the generated pages (text, prompt, layout, image) for a template, for the editor. */
  public getPages = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const pages = templateStore.getPages(id);
      if (pages === null) {
        res.status(404).json({ error: "No generated pages for this story yet." });
        return;
      }
      res.status(200).json(pages);
    } catch (error: any) {
      console.error("[StoryLibraryController] Error listing pages:", error);
      res.status(500).json({ error: "Failed to list pages: " + error.message });
    }
  };

  /** Edits one generated page's story text, illustration prompt, and/or chosen layout. */
  public updatePage = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, pageNumber } = req.params;
      const { storyText, illustrationPrompt, layoutId } = req.body || {};
      const patch: Partial<TemplatePageDoc> = {};
      if (typeof storyText === "string") patch.storyText = storyText;
      if (typeof illustrationPrompt === "string") patch.illustrationPrompt = illustrationPrompt;
      if (layoutId !== undefined) patch.layoutId = layoutPlanStore.getLayoutById(Number(layoutId)).layoutId;
      if (Object.keys(patch).length === 0) {
        res.status(400).json({ error: "Nothing to update." });
        return;
      }

      const updated = await templateStore.updatePage(id, Number(pageNumber), patch);
      if (!updated) {
        res.status(404).json({ error: "Page not found (generate pages first)." });
        return;
      }
      res.status(200).json({ success: true, page: updated });
    } catch (error: any) {
      console.error("[StoryLibraryController] Error updating page:", error);
      res.status(500).json({ error: "Failed to update page: " + error.message });
    }
  };

  /**
   * REDESIGN — generates ONE page's image WITH its story text baked in, composed per the page's
   * chosen layout, conditioned on the cast reference sheets. Stores the image in GCS at the
   * template level (reused across users) and records its URL on the page. Extracted from the HTTP
   * handler so book creation can also call it (to render a template page's image on first use).
   */
  public async generatePageImageForStory(id: string, pageNum: number): Promise<string> {
    const pages = templateStore.getPages(id);
    const page = pages?.find((p) => p.pageNumber === pageNum);
    if (!page) throw new Error("Page not found (generate pages first).");

    const story = templateStore.getStory(id) ?? storyLibraryService.getStory(id);
    const nameOf = (key: string) => story?.characters.find((c) => c.key === key)?.displayName || key;

    // Condition on the referenced cast members' reference sheets so faces/costumes stay consistent.
    const references = (await Promise.all(
      (page.characterKeys || []).map((key) => storyLibraryService.getCharacterImageBase64(id, key))
    )).filter((ref): ref is { mime: string; data: string } => !!ref);

    const layout = layoutPlanStore.getLayoutById(page.layoutId);
    const imagePrompt = promptEngine.buildTextPageImagePrompt(
      page.storyText,
      page.illustrationPrompt,
      layout.prompt,
      (page.characterKeys || []).map(nameOf)
    );

    const imageProvider = db.settings?.imageProvider || "gemini";
    const dataUri = imageProvider === "openai"
      ? await openaiProvider.generateImageWithReferences(imagePrompt, references)
      : (imageProvider === "procedural"
          ? geminiProvider.createProceduralIllustration(imagePrompt, IllustrationStyle.STORYBOOK)
          : await geminiProvider.generateImageWithReferences(imagePrompt, references, IllustrationStyle.STORYBOOK));

    const imageUrl = await storageService.uploadDataUri(dataUri, `pages/${id}/${pageNum}-${Date.now()}`);
    await templateStore.updatePage(id, pageNum, { imageUrl });
    return imageUrl;
  }

  /** Reuses a template page's image if it already has one; otherwise renders and caches it. */
  public async ensurePageImage(id: string, pageNum: number): Promise<string> {
    const pages = templateStore.getPages(id);
    const existing = pages?.find((p) => p.pageNumber === pageNum)?.imageUrl;
    if (existing) return existing;
    return this.generatePageImageForStory(id, pageNum);
  }

  public generatePageImage = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, pageNumber } = req.params;
      const pageNum = Number(pageNumber);
      const imageUrl = await this.generatePageImageForStory(id, pageNum);
      res.status(200).json({ success: true, pageNumber: pageNum, imageUrl });
    } catch (error: any) {
      console.error("[StoryLibraryController] Error generating page image:", error);
      res.status(500).json({ error: "Failed to generate page image: " + error.message });
    }
  };

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

}

export const storyLibraryController = new StoryLibraryController();
