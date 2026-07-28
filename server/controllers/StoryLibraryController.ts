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
import { ART_STYLES, DEFAULT_STYLE_ID, getStyle } from "../config/styles.js";
import { getProtagonistKey } from "../config/protagonists.js";
import { getCoverScene } from "../config/coverPrompts.js";
import { getCoverTitle } from "../config/coverTitles.js";

/**
 * Extracts the single balanced { ... } JSON object from a text-model response, ignoring any
 * markdown fences or stray trailing text the model appends after the real object (seen in the
 * wild: the model duplicating a closing "]}" after an already-complete, valid JSON object —
 * a plain `JSON.parse` on the whole response fails on that trailing junk even though the actual
 * page data is fine). Throws if no balanced object is found.
 */
function extractJsonObject(text: string): string {
  const start = text.indexOf("{");
  if (start === -1) throw new Error("No JSON object found in model output.");
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  throw new Error("Unbalanced JSON object in model output.");
}

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
      parsed = JSON.parse(extractJsonObject(jsonText));
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
  public async generatePageImageForStory(id: string, pageNum: number, styleId: string = DEFAULT_STYLE_ID): Promise<string> {
    const pages = templateStore.getPages(id);
    const page = pages?.find((p) => p.pageNumber === pageNum);
    if (!page) throw new Error("Page not found (generate pages first).");

    const style = getStyle(styleId);
    const story = templateStore.getStory(id) ?? storyLibraryService.getStory(id);
    const nameOf = (key: string) => story?.characters.find((c) => c.key === key)?.displayName || key;

    // Characters flagged textOnlyNearHumans (e.g. Shere Khan) never get their reference photo
    // sent alongside another character's, and characters flagged dropReferenceNearAntagonist
    // (e.g. Mowgli) additionally drop their OWN photo on any page they share with one of those
    // antagonists — see the field doc comments in src/types.ts. Both are still described in the
    // text prompt as normal, just not photo-conditioned on the affected pages; alone (or without
    // an antagonist present), a character's own reference photo is used as normal.
    const pageKeys = page.characterKeys || [];
    const rawChars = templateStore.getCharacters(id) || [];
    const antagonistKeys = new Set(rawChars.filter((c) => c.textOnlyNearHumans).map((c) => c.key));
    const dropNearAntagonistKeys = new Set(rawChars.filter((c) => c.dropReferenceNearAntagonist).map((c) => c.key));
    const antagonistOnPage = pageKeys.some((k) => antagonistKeys.has(k));

    // Condition on the referenced cast members' reference sheets (in the chosen style) so
    // faces/costumes stay consistent — and match the style the page is being rendered in.
    const references = (await Promise.all(
      pageKeys.map((key) => {
        if (antagonistKeys.has(key) && pageKeys.length > 1) return Promise.resolve(null);
        if (antagonistOnPage && dropNearAntagonistKeys.has(key)) return Promise.resolve(null);
        return storyLibraryService.getCharacterImageBase64(id, key, style.id);
      })
    )).filter((ref): ref is { mime: string; data: string } => !!ref);

    const layout = layoutPlanStore.getLayoutById(page.layoutId);
    const imagePrompt = promptEngine.buildTextPageImagePrompt(
      page.storyText,
      page.illustrationPrompt,
      layout.prompt,
      (page.characterKeys || []).map(nameOf),
      style
    );

    const imageProvider = db.settings?.imageProvider || "gemini";
    const dataUri = imageProvider === "openai"
      ? await openaiProvider.generateImageWithReferences(imagePrompt, references)
      : (imageProvider === "procedural"
          ? geminiProvider.createProceduralIllustration(imagePrompt, IllustrationStyle.STORYBOOK)
          : await geminiProvider.generateImageWithReferences(imagePrompt, references, IllustrationStyle.STORYBOOK));

    const imageUrl = await storageService.uploadDataUri(dataUri, `pages/${id}/${style.id}/${pageNum}-${Date.now()}`);
    await templateStore.setPageImage(id, pageNum, style.id, imageUrl);
    return imageUrl;
  }

  /** Reuses a template page's image (for the given style) if it already has one; otherwise renders and caches it. */
  public async ensurePageImage(id: string, pageNum: number, styleId: string = DEFAULT_STYLE_ID): Promise<string> {
    const pages = templateStore.getPages(id);
    const page = pages?.find((p) => p.pageNumber === pageNum);
    const existing = styleId === DEFAULT_STYLE_ID ? page?.imageUrl : page?.imageUrls?.[styleId];
    if (existing) return existing;
    return this.generatePageImageForStory(id, pageNum, styleId);
  }

  /**
   * REDESIGN — generates this story's template FRONT COVER for a style: the story's protagonist as
   * the hero, the ORIGINAL story title baked in, conditioned on the protagonist's cast reference so
   * their likeness matches the interior pages. Stored on the story template and reused by every
   * generic (non-personalized) book of this story. Personalized books render their own cover per
   * book (hero = the child, title personalized) — see QueueService.executeCoverJob.
   */
  public async generateCoverImageForStory(id: string, styleId: string = DEFAULT_STYLE_ID): Promise<string> {
    const style = getStyle(styleId);
    const story = templateStore.getStory(id) ?? storyLibraryService.getStory(id);
    if (!story) throw new Error("Story library entry not found.");

    // Hero = the story's designated protagonist; if the story has none (ensemble cast), fall back
    // to its first cast member so the cover still features a real character reference.
    const protagonistKey = getProtagonistKey(id);
    const heroKey = protagonistKey && story.characters.some((c) => c.key === protagonistKey)
      ? protagonistKey
      : story.characters[0]?.key;
    const heroName = story.characters.find((c) => c.key === heroKey)?.displayName || null;

    const heroRef = heroKey ? await storyLibraryService.getCharacterImageBase64(id, heroKey, style.id) : null;
    const references = heroRef ? [heroRef] : [];

    // Prefer the story's hand-written iconic cover scene (coverPrompts.ts) so the cover is the
    // RIGHT recognizable scene for this story; fall back to the opening page, then a generic hint.
    const pages = templateStore.getPages(id);
    const sceneHint = getCoverScene(id)
      || pages?.[0]?.illustrationPrompt?.trim()
      || `A warm, inviting scene that captures the spirit of "${story.title}".`;

    // Template cover has no child — always the story's default heading.
    const title = getCoverTitle(id, null, story.title);
    const imagePrompt = promptEngine.buildCoverImagePrompt(
      title,
      heroName,
      sceneHint,
      style,
      heroRef && heroName ? { name: heroName, refCount: 1 } : undefined
    );

    const imageProvider = db.settings?.imageProvider || "gemini";
    const dataUri = imageProvider === "openai"
      ? await openaiProvider.generateImageWithReferences(imagePrompt, references)
      : (imageProvider === "procedural"
          ? geminiProvider.createProceduralIllustration(imagePrompt, IllustrationStyle.STORYBOOK)
          : await geminiProvider.generateImageWithReferences(imagePrompt, references, IllustrationStyle.STORYBOOK));

    const imageUrl = await storageService.uploadDataUri(dataUri, `covers/${id}/${style.id}/cover-${Date.now()}`);
    await templateStore.setCoverImage(id, style.id, imageUrl);
    return imageUrl;
  }

  /** Explicitly (re)generates a story template's cover for a style — always overwrites (see generateCastForStyle). */
  public generateCoverImage = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const styleId = getStyle((req.body?.styleId as string) || (req.query.styleId as string)).id;
      const imageUrl = await this.generateCoverImageForStory(id, styleId);
      res.status(200).json({ success: true, styleId, imageUrl });
    } catch (error: any) {
      console.error("[StoryLibraryController] Error generating cover image:", error);
      const status = /not found/i.test(error.message) ? 404 : 500;
      res.status(status).json({ error: "Failed to generate cover image: " + error.message });
    }
  };

  public generatePageImage = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, pageNumber } = req.params;
      const pageNum = Number(pageNumber);
      // Resolve to the canonical id before echoing it back — the client keys its local page-image
      // map by this value, which must match the style the backend actually stored under.
      const styleId = getStyle((req.body?.styleId as string) || (req.query.styleId as string)).id;
      const imageUrl = await this.generatePageImageForStory(id, pageNum, styleId);
      res.status(200).json({ success: true, pageNumber: pageNum, styleId, imageUrl });
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
      const styleId = getStyle(req.query.styleId as string).id;
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

      const gcsPath = await storyLibraryService.getCharacterGcsPath(id, normalizedKey, styleId);
      const hasImage = !!gcsPath || (styleId === DEFAULT_STYLE_ID && !!storyLibraryService.getCharacterImagePath(id, normalizedKey));

      res.status(200).json({
        key: character.key,
        displayName: character.displayName,
        prompt,
        hasImage,
        displaySheetImageUrl: doc?.displaySheetImageUrls?.[styleId] || null,
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
      const style = getStyle(req.body?.styleId as string);

      const story = storyLibraryService.getStory(id);
      const character = story?.characters.find((c) => c.key === normalizedKey);
      if (!story || !character) {
        res.status(404).json({ error: "Character not found in this story." });
        return;
      }

      // The clean single image for THIS style becomes the reference; the .md/Firestore prompt
      // describes it. If this style's clean reference hasn't been generated yet, the caller
      // should hit "generate cast in this style" first — regenerating a display sheet without a
      // matching clean reference would drift from what the story's pages actually use.
      const reference = await storyLibraryService.getCharacterImageBase64(id, normalizedKey, style.id);
      const doc = await templateStore.getCharacter(id, normalizedKey);
      const description = doc?.prompt ?? storyLibraryService.getCharacterDescription(id, normalizedKey) ?? `The character "${character.displayName}".`;

      const prompt = promptEngine.generateCastSheetPrompt(character.displayName, description, style);
      const refImages = reference ? [reference] : [];
      const imageProvider = db.settings?.imageProvider || "gemini";

      const dataUri = imageProvider === "openai"
        ? await openaiProvider.generateImageWithReferences(prompt, refImages)
        : (imageProvider === "procedural"
            ? geminiProvider.createProceduralIllustration(prompt, IllustrationStyle.STORYBOOK)
            : await geminiProvider.generateImageWithReferences(prompt, refImages, IllustrationStyle.STORYBOOK));

      // Store under a "-sheet-" suffix so it is NOT picked up as the generation reference
      // (which is matched by the prefix "casts/<id>/<styleId>/<key>." — note the trailing dot).
      // Always use the RESOLVED style.id, never the raw request value: getStyle() falls back to
      // the default for an unknown id, so filing under the raw value would store art rendered in
      // one style under the name of another (and let a caller write arbitrary object paths /
      // Firestore map keys).
      const displaySheetImageUrl = await storageService.uploadDataUri(dataUri, `casts/${id}/${style.id}/${normalizedKey}-sheet-${Date.now()}`);
      await templateStore.setCharacterDisplaySheet(id, normalizedKey, style.id, displaySheetImageUrl);

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
      const styleId = getStyle(req.query.styleId as string).id;
      // Cloud-first: cast reference images live in GCS (casts/<id>/<styleId>/<key>.*), with the
      // default style also falling back to the original flat casts/<id>/<key>.* layout.
      const gcsPath = await storyLibraryService.getCharacterGcsPath(id, key, styleId);
      if (gcsPath) {
        await storageService.streamTo(gcsPath, res);
        return;
      }
      if (styleId === DEFAULT_STYLE_ID) {
        const filePath = storyLibraryService.getCharacterImagePath(id, key);
        if (filePath) {
          res.sendFile(filePath);
          return;
        }
      }
      res.status(404).json({ error: "Character reference image not found for this style." });
    } catch (error: any) {
      console.error("[StoryLibraryController] Error streaming character image:", error);
      res.status(500).json({ error: "Failed to load character image: " + error.message });
    }
  };

  /** The art style catalogue (id, label) for the Story Library's style switcher. */
  public listStyles = async (req: Request, res: Response): Promise<void> => {
    res.status(200).json(ART_STYLES.map((s) => ({ id: s.id, label: s.label })));
  };

  /**
   * Generates (or REGENERATES) this story's cast in a given style — conditioned on each
   * character's DEFAULT-style reference image so identity (face, proportions, costume) carries
   * across styles and only the rendering style changes — and uploads to
   * casts/<storyId>/<styleId>/<key>.<ext>, overwriting any existing image for this style. This is
   * an explicit, user-triggered action (a button click, never fired automatically), so it always
   * overwrites rather than skipping already-generated characters — matching every other
   * "Regenerate" action in this app (page images, display sheets). That's what makes tuning a
   * style's prompt in styles.ts actually take effect on existing art: edit the prompt, restart the
   * server, click this again. Never touches or regenerates any other style's images.
   */
  public generateCastForStyle = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, styleId } = req.params;
      const style = getStyle(styleId);
      const story = storyLibraryService.getStory(id);
      if (!story) {
        res.status(404).json({ error: "Story library entry not found." });
        return;
      }

      const generated: string[] = [];
      const skipped: string[] = [];
      const failed: string[] = [];

      // The default style is never (re)generated here: its images ARE the original cast art,
      // which already exists on disk/in GCS for every seeded character.
      if (style.id === DEFAULT_STYLE_ID) {
        res.status(200).json({ success: true, styleId: style.id, generated: [], skipped: story.characters.map((c) => c.key), failed: [] });
        return;
      }

      for (const character of story.characters) {
        try {
          const doc = await templateStore.getCharacter(id, character.key);
          const description = doc?.prompt ?? storyLibraryService.getCharacterDescription(id, character.key) ?? `The character "${character.displayName}".`;
          const reference = await storyLibraryService.getCharacterImageBase64(id, character.key, DEFAULT_STYLE_ID);

          const prompt = promptEngine.generateStyledCastReferencePrompt(description, style);
          const refImages = reference ? [reference] : [];
          const imageProvider = db.settings?.imageProvider || "gemini";

          const dataUri = imageProvider === "openai"
            ? await openaiProvider.generateImageWithReferences(prompt, refImages)
            : await geminiProvider.generateImageWithReferences(prompt, refImages, IllustrationStyle.STORYBOOK);

          const match = /^data:image\/([a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUri);
          if (!match || match[1] === "svg+xml") {
            failed.push(character.key);
            continue;
          }
          const [, subtype, b64] = match;
          await storageService.uploadBuffer(`casts/${id}/${style.id}/${character.key}.${subtype === "jpeg" ? "jpg" : subtype}`, Buffer.from(b64, "base64"), `image/${subtype}`);
          generated.push(character.key);
        } catch (err: any) {
          console.error(`[StoryLibraryController] Failed to generate ${character.key} in style ${style.id}:`, err.message);
          failed.push(character.key);
        }
      }

      res.status(200).json({ success: true, styleId: style.id, generated, skipped, failed });
    } catch (error: any) {
      console.error("[StoryLibraryController] Error generating cast for style:", error);
      res.status(500).json({ error: "Failed to generate cast for style: " + error.message });
    }
  };

}

export const storyLibraryController = new StoryLibraryController();
