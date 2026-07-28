/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Job, JobType, IllustrationStyle, Character } from "../../src/types.js";
import { JobRepository } from "../repositories/JobRepository.js";
import { CharacterRepository } from "../repositories/CharacterRepository.js";
import { BookRepository } from "../repositories/BookRepository.js";
import { promptEngine } from "../providers/PromptEngine.js";
import { geminiProvider } from "../providers/GeminiProvider.js";
import { openaiProvider } from "../providers/OpenAIProvider.js";
import { storyLibraryService } from "./StoryLibraryService.js";
import { storyLibraryController } from "../controllers/StoryLibraryController.js";
import { layoutPlanStore } from "./LayoutPlanStore.js";
import { storageService } from "./StorageService.js";
import { db } from "../database/db.js";
import { ArtStyle, getStyle } from "../config/styles.js";
import { getProtagonistKey, getProtagonistName, personalizeStoryText } from "../config/protagonists.js";
import { getCoverScene } from "../config/coverPrompts.js";
import { getCoverTitle } from "../config/coverTitles.js";

export class QueueService {
  private activeJobsCount = 0;
  private readonly maxConcurrency = 2; // Process 2 jobs concurrently
  private isProcessing = false;
  // Hard ceiling on a single job attempt. Provider calls (esp. reference-conditioned image
  // generation) can occasionally hang indefinitely with no network timeout; without this a
  // hung job would never release its concurrency slot and, with only maxConcurrency slots,
  // two hangs freeze the entire pipeline. On timeout the attempt throws and is retried.
  private static readonly JOB_ATTEMPT_TIMEOUT_MS = 120000; // 2 minutes

  constructor(
    private jobRepo: JobRepository,
    private characterRepo: CharacterRepository,
    private bookRepo: BookRepository
  ) {
    // Recover jobs left mid-flight by a previous run (hung provider call / server restart),
    // then start the background processor loop.
    this.recoverOrphanedJobs();
    setInterval(() => this.processQueue(), 2000);
  }

  /**
   * Rejects if the given promise does not settle within `ms`. Used to bound each job attempt
   * so a hung provider call cannot permanently occupy a concurrency slot.
   */
  private withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`${label} timed out after ${ms}ms`)),
        ms
      );
      promise.then(
        (val) => { clearTimeout(timer); resolve(val); },
        (err) => { clearTimeout(timer); reject(err); }
      );
    });
  }

  /**
   * On startup the in-memory concurrency counter resets to 0, but the persisted DB may still
   * hold jobs stuck in "Generating" from a previous run (a hung provider call, or a restart
   * mid-render). Those would otherwise sit forever and their pages would show "Generating"
   * with no worker behind them. Re-queue them so the processor picks them up again, and reset
   * any half-rendered pages back to "Queued".
   */
  private async recoverOrphanedJobs() {
    try {
      const all = await this.jobRepo.findAll();
      const orphaned = all.filter((j) => j.status === "Generating");
      for (const j of orphaned) {
        await this.jobRepo.update(j.id, { status: "Queued", progress: 0 });
        if (j.type === JobType.IMAGE && j.payload?.bookId && j.payload?.pageNumber) {
          await this.bookRepo.updatePage(j.payload.bookId, j.payload.pageNumber, { imageStatus: "Queued" });
        }
      }
      if (orphaned.length) {
        console.log(`[QueueService] Re-queued ${orphaned.length} orphaned job(s) from a previous run.`);
      }
    } catch (error) {
      console.error("[QueueService] Failed to recover orphaned jobs:", error);
    }
  }

  /**
   * Adds a new task to the queue
   */
  public async addJob(type: JobType, payload: any): Promise<Job> {
    const job: Job = {
      id: "job_" + Math.random().toString(36).substring(2, 11),
      type,
      status: "Queued",
      progress: 0,
      payload,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await this.jobRepo.create(job);
    console.log(`[QueueService] Job added: ${job.id} (${type})`);
    
    // Trigger queue processing asynchronously
    this.processQueue();
    return saved;
  }

  /**
   * Monitors and processes queued jobs with concurrency control
   */
  private async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const allJobs = await this.jobRepo.findAll();
      const queuedJobs = allJobs
        .filter((j) => j.status === "Queued")
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      while (this.activeJobsCount < this.maxConcurrency && queuedJobs.length > 0) {
        const nextJob = queuedJobs.shift();
        if (nextJob) {
          this.activeJobsCount++;
          this.runJob(nextJob).finally(() => {
            this.activeJobsCount--;
            this.processQueue();
          });
        }
      }
    } catch (error) {
      console.error("[QueueService] Error in processQueue loop:", error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Executes a job based on its type
   */
  private async runJob(job: Job) {
    console.log(`[QueueService] Starting job: ${job.id} (${job.type})`);
    await this.jobRepo.update(job.id, { status: "Generating", progress: 10 });

    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        const timeout = QueueService.JOB_ATTEMPT_TIMEOUT_MS;
        const label = `Job ${job.id} (${job.type})`;
        if (job.type === JobType.CHARACTER_SHEET) {
          await this.withTimeout(this.executeCharacterSheetJob(job), timeout, label);
        } else if (job.type === JobType.IMAGE) {
          await this.withTimeout(this.executeImageJob(job), timeout, label);
        } else if (job.type === JobType.COVER) {
          await this.withTimeout(this.executeCoverJob(job), timeout, label);
        } else if (job.type === JobType.PDF) {
          await this.withTimeout(this.executePDFJob(job), timeout, label);
        }

        console.log(`[QueueService] Job completed successfully: ${job.id}`);
        return; // Success
      } catch (error: any) {
        console.error(`[QueueService] Attempt ${attempts} failed for job ${job.id}:`, error);
        
        if (attempts >= maxAttempts) {
          await this.jobRepo.update(job.id, {
            status: "Failed",
            progress: 100,
            error: error.message || "Job execution failed after maximum retries."
          });
          
          // Propagate image failure to specific book page if applicable
          if (job.type === JobType.IMAGE && job.payload?.bookId && job.payload?.pageNumber) {
            await this.bookRepo.updatePage(job.payload.bookId, job.payload.pageNumber, {
              imageStatus: "Failed",
              imageError: error.message || "Illustration generation failed."
            });
          }

          // Propagate cover failure to the book so the UI can surface a retry.
          if (job.type === JobType.COVER && job.payload?.bookId) {
            await this.bookRepo.update(job.payload.bookId, {
              coverImageStatus: "Failed",
              coverImageError: error.message || "Cover generation failed."
            });
          }
        } else {
          // Linear backoff wait
          await new Promise((resolve) => setTimeout(resolve, attempts * 1000));
        }
      }
    }
  }

  /**
   * Renders a hero character's reference sheet in the given style, conditioned on their uploaded
   * photos. Shared by the default-style character-creation job below and by book creation (which
   * needs the SAME hero re-rendered in whatever style that particular book uses — see
   * BookController.createBookFromLibrary). Returns the uploaded sheet image URL; does not persist
   * a CharacterSheet record itself (callers decide where the result belongs).
   */
  public async generateHeroReferenceSheet(char: Character, style: ArtStyle = getStyle()): Promise<string> {
    // Resolve the child's uploaded photos as IMAGE references. The reference sheet is now
    // conditioned on the real photos, so the AI derives the child's actual appearance (hair
    // style incl. braids, hair/eye colour, skin tone, facial features) straight from them —
    // instead of from limited dropdown selections. Optional free-text notes still enrich it.
    const photoRefs = (await Promise.all(
      (char.photos || []).slice(0, 3).map((p) => storageService.resolveReference(p))
    )).filter((ref): ref is { mime: string; data: string } => !!ref);

    const notes = [char.description, char.personality, char.additionalNotes].filter(Boolean).join(". ");
    let visualDetails = notes;
    if (photoRefs.length > 0) {
      visualDetails += (notes ? "\n\n" : "") +
        "Reference photos of the real child are provided as IMAGE references. Faithfully capture the child's actual appearance from them — hairstyle (including braids/locs/curls), hair colour, skin tone, eye colour, and distinctive facial features — and re-draw the child in the target art style.";
    }

    const prompt = promptEngine.generateCharacterPrompt(char.name, char.age, char.gender, visualDetails, style);

    // Call configured provider. With photos, generate conditioned on them; otherwise fall back
    // to a text-only sheet (both providers gracefully degrade when no references are supplied).
    const imageProvider = db.settings?.imageProvider || "gemini";
    const rawSheetImage = imageProvider === "openai"
      ? await openaiProvider.generateImageWithReferences(prompt, photoRefs)
      : await geminiProvider.generateImageWithReferences(prompt, photoRefs, IllustrationStyle.STORYBOOK);

    // Offload to GCS (returns a /api/images/... URL); falls back to the inline data URI if
    // storage is disabled or the upload fails.
    return storageService.uploadDataUri(rawSheetImage, `sheets/${char.id}-${style.id}-${Date.now()}`);
  }

  /**
   * Generates a persistent character reference sheet (default style; the one stored on the
   * Character itself and reused across every book unless a book picks a different style).
   */
  private async executeCharacterSheetJob(job: Job) {
    const { characterId } = job.payload;
    const char = await this.characterRepo.findById(characterId);
    if (!char) throw new Error(`Character ${characterId} not found.`);

    await this.jobRepo.update(job.id, { progress: 30 });
    const sheetImage = await this.generateHeroReferenceSheet(char);
    await this.jobRepo.update(job.id, { progress: 80 });

    const sheet = await this.characterRepo.createSheet({
      id: "sheet_" + Math.random().toString(36).substring(2, 11),
      characterId,
      sheetImage,
      approved: false, // User must approve character sheet
      createdAt: new Date().toISOString()
    });

    await this.jobRepo.update(job.id, {
      status: "Completed",
      progress: 100,
      result: { characterSheetId: sheet.id }
    });
  }

  /**
   * Generates a single-page illustration using approved character reference views
   */
  private async executeImageJob(job: Job) {
    const { bookId, pageNumber } = job.payload;
    const book = await this.bookRepo.findById(bookId);
    if (!book) throw new Error(`Book ${bookId} not found.`);
    if (!book.libraryStoryId) throw new Error(`Book ${bookId} has no libraryStoryId — cannot resolve its template page.`);

    const page = book.pages.find(p => p.pageNumber === pageNumber);
    if (!page) throw new Error(`Book page ${pageNumber} not found.`);

    await this.bookRepo.updatePage(bookId, pageNumber, { imageStatus: "Generating" });
    await this.jobRepo.update(job.id, { progress: 30 });

    let imageUrl: string;

    if (!book.characterId) {
      // Generic (non-personalized) book: reuse the template page's image if it already has one
      // (instant, no Gemini spend); otherwise render it once and cache it on the TEMPLATE page so
      // every future generic book for this story reuses the same image from here on.
      imageUrl = await storyLibraryController.ensurePageImage(book.libraryStoryId, pageNumber);
    } else {
      // Personalized: the child's real face has to be baked into a fresh render every time, with
      // the story text baked in per the page's chosen layout (same as the template pipeline).
      const style = getStyle(book.styleId);
      const story = storyLibraryService.getStory(book.libraryStoryId);

      // The child REPLACES the story's protagonist (e.g. Emma stars in place of Thumbelina). The
      // template pages bake the protagonist's real name + appearance in and list the protagonist
      // in characterKeys, so for a personalized book we must (a) NOT send the original
      // protagonist's reference image — the child's photo is the only hero reference — and
      // (b) swap the protagonist's name for the child's throughout the text/scene prompt. Pages
      // for stories with no single designated protagonist (getProtagonistKey === null) fall back
      // to using the authored cast as-is.
      const protagonistKey = getProtagonistKey(book.libraryStoryId);
      const protagonistName = getProtagonistName(book.libraryStoryId, story?.characters || []);
      const supportingKeys = (page.characterKeys || []).filter((k) => k !== protagonistKey);

      // Supporting cast references in the BOOK'S style — if that style's cast hasn't been
      // generated for this story yet (via the Story Library's "Generate cast in this style"),
      // getCharacterImageBase64 returns null for a non-default style rather than falling back to
      // a different style's art, so that character is simply described in text on this page
      // instead of photo-conditioned with a mismatched-style reference.
      const referenceImages = (await Promise.all(
        supportingKeys.map((key) => storyLibraryService.getCharacterImageBase64(book.libraryStoryId!, key, style.id))
      )).filter((ref): ref is { mime: string; data: string } => !!ref);

      const hero = await this.characterRepo.findById(book.characterId);
      let heroRefCount = 0;
      if (hero) {
        const heroRefs: { mime: string; data: string }[] = [];
        // A book rendered in a non-default style gets the hero re-drawn in THAT style once at
        // book-creation time (see BookController.createBookFromLibrary) — prefer it over the
        // character's own (likely different-style) sheet so the hero doesn't fight the page's
        // art style on every single render.
        const styledSheetRef = book.heroStyledSheetUrl ? await storageService.resolveReference(book.heroStyledSheetUrl) : null;
        if (styledSheetRef) {
          heroRefs.push(styledSheetRef);
        } else if (hero.characterSheetId) {
          const sheet = await this.characterRepo.findSheetById(hero.characterSheetId);
          const ref = sheet?.sheetImage ? await storageService.resolveReference(sheet.sheetImage) : null;
          if (ref) heroRefs.push(ref);
        }
        for (const photo of (hero.photos || []).slice(0, 3)) {
          const ref = await storageService.resolveReference(photo);
          if (ref) heroRefs.push(ref);
        }
        // Hero references go first so the protagonist's likeness is prioritized.
        referenceImages.unshift(...heroRefs);
        heroRefCount = heroRefs.length;
      }

      // Books created from this version onward already store personalized text (see
      // BookController.createBookFromLibrary); re-applying here is a no-op for those and repairs
      // books created BEFORE that change, whose stored text still names the original protagonist.
      const scenePrompt = personalizeStoryText(page.illustrationPrompt, protagonistName, book.childName);
      const storyText = personalizeStoryText(page.storyText || "", protagonistName, book.childName);
      const nameOf = (key: string) => story?.characters.find((c) => c.key === key)?.displayName || key;
      const layout = layoutPlanStore.getLayoutById(page.layoutId);
      const imagePrompt = promptEngine.buildTextPageImagePrompt(
        storyText,
        scenePrompt,
        layout.prompt,
        supportingKeys.map(nameOf), // the hero is named via the `hero` arg below, not this list
        style,
        // Only pass a hero name/count when the hero actually contributed reference images —
        // otherwise the prompt would tell the model to prioritize a reference that isn't there.
        heroRefCount > 0 ? { name: book.childName, refCount: heroRefCount } : undefined
      );

      await this.jobRepo.update(job.id, { progress: 50 });

      const imageProvider = db.settings?.imageProvider || "gemini";
      const dataUri = imageProvider === "openai"
        ? await openaiProvider.generateImageWithReferences(imagePrompt, referenceImages)
        : (imageProvider === "procedural"
            ? geminiProvider.createProceduralIllustration(imagePrompt, book.style)
            : await geminiProvider.generateImageWithReferences(imagePrompt, referenceImages, book.style));

      // Offload to GCS (returns a /api/images/... URL); degrades to the inline data URI if
      // storage is disabled or the upload fails.
      imageUrl = await storageService.uploadDataUri(dataUri, `illustrations/${bookId}/${pageNumber}-${Date.now()}`);
    }

    await this.bookRepo.updatePage(bookId, pageNumber, {
      imageUrl,
      imageStatus: "Completed"
    });

    await this.jobRepo.update(job.id, {
      status: "Completed",
      progress: 100,
      result: { bookId, pageNumber, imageUrl: imageUrl.slice(0, 100) + "..." }
    });
  }

  /**
   * Generates a book's FRONT COVER — hero-conditioned, with the (personalized) story title baked
   * in. A generic book reuses the story template's cached cover for its style (instant, no spend);
   * a personalized book renders its own — the child is the hero and the title is personalized
   * (e.g. "Alice's Adventures in Wonderland" → "Emma's Adventures in Wonderland").
   */
  private async executeCoverJob(job: Job) {
    const { bookId } = job.payload;
    const book = await this.bookRepo.findById(bookId);
    if (!book) throw new Error(`Book ${bookId} not found.`);
    if (!book.libraryStoryId) throw new Error(`Book ${bookId} has no libraryStoryId — cannot resolve its cover.`);

    await this.bookRepo.update(bookId, { coverImageStatus: "Generating" });
    await this.jobRepo.update(job.id, { progress: 30 });

    let coverImageUrl: string;

    if (!book.characterId) {
      // Generic (non-personalized) book: render the template cover for this style and cache it on
      // the template. This is an explicit user click, so it always (re)renders — matching every
      // other "Regenerate" action in the app — rather than silently reusing a stale cached cover.
      coverImageUrl = await storyLibraryController.generateCoverImageForStory(book.libraryStoryId, book.styleId);
    } else {
      // Personalized: the child is the hero and the title is personalized, so render fresh.
      const style = getStyle(book.styleId);
      const story = storyLibraryService.getStory(book.libraryStoryId);
      const protagonistName = getProtagonistName(book.libraryStoryId, story?.characters || []);
      // Per-story heading: personalized where it still reads as that story (e.g. "Emma's Adventures
      // in Wonderland"), otherwise the plain default (e.g. "Thumbelina") — never a blind name-swap
      // that would collapse a name-only title to just the child's name.
      const title = getCoverTitle(book.libraryStoryId, book.childName, story?.title || book.title);

      // Hero references: the styled sheet (non-default style) or the character's default sheet,
      // then up to 3 uploaded photos — same priority order as page rendering (executeImageJob).
      const hero = await this.characterRepo.findById(book.characterId);
      const heroRefs: { mime: string; data: string }[] = [];
      if (hero) {
        const styledSheetRef = book.heroStyledSheetUrl ? await storageService.resolveReference(book.heroStyledSheetUrl) : null;
        if (styledSheetRef) {
          heroRefs.push(styledSheetRef);
        } else if (hero.characterSheetId) {
          const sheet = await this.characterRepo.findSheetById(hero.characterSheetId);
          const ref = sheet?.sheetImage ? await storageService.resolveReference(sheet.sheetImage) : null;
          if (ref) heroRefs.push(ref);
        }
        for (const photo of (hero.photos || []).slice(0, 3)) {
          const ref = await storageService.resolveReference(photo);
          if (ref) heroRefs.push(ref);
        }
      }

      // Prefer the story's hand-written iconic cover scene (coverPrompts.ts), personalized so
      // "the hero" reads as the child; fall back to the book's opening page, then a generic hint.
      const firstPage = [...book.pages].sort((a, b) => a.pageNumber - b.pageNumber)[0];
      const sceneHint = personalizeStoryText(
        getCoverScene(book.libraryStoryId)
          || firstPage?.illustrationPrompt?.trim()
          || `A warm, inviting scene that captures the spirit of "${title}".`,
        protagonistName,
        book.childName
      );

      await this.jobRepo.update(job.id, { progress: 50 });

      const imagePrompt = promptEngine.buildCoverImagePrompt(
        title,
        book.childName,
        sceneHint,
        style,
        heroRefs.length > 0 ? { name: book.childName, refCount: heroRefs.length } : undefined
      );

      const imageProvider = db.settings?.imageProvider || "gemini";
      const dataUri = imageProvider === "openai"
        ? await openaiProvider.generateImageWithReferences(imagePrompt, heroRefs)
        : (imageProvider === "procedural"
            ? geminiProvider.createProceduralIllustration(imagePrompt, book.style)
            : await geminiProvider.generateImageWithReferences(imagePrompt, heroRefs, book.style));

      coverImageUrl = await storageService.uploadDataUri(dataUri, `covers/${bookId}/cover-${Date.now()}`);
    }

    await this.bookRepo.update(bookId, { coverImageUrl, coverImageStatus: "Completed", coverImageError: undefined });
    await this.jobRepo.update(job.id, {
      status: "Completed",
      progress: 100,
      result: { bookId, coverImageUrl: coverImageUrl.slice(0, 100) + "..." }
    });
  }

  /**
   * Generates a printable PDF export metadata representation
   */
  private async executePDFJob(job: Job) {
    const { bookId } = job.payload;
    const book = await this.bookRepo.findById(bookId);
    if (!book) throw new Error(`Book ${bookId} not found.`);

    await this.jobRepo.update(job.id, { progress: 50 });
    
    // Simulate compilation of images and text metadata
    const completedPages = book.pages.filter(p => p.imageStatus === "Completed").length;
    console.log(`[QueueService] PDF compilation progress for book ${bookId}: ${completedPages}/${book.pages.length} pages ready.`);

    await this.jobRepo.update(job.id, {
      status: "Completed",
      progress: 100,
      result: {
        bookId,
        pdfUrl: `/api/books/${bookId}/download-pdf`,
        pagesCount: book.pages.length,
        status: "Compiled"
      }
    });
  }
}
export type QueueServiceInstance = QueueService;
