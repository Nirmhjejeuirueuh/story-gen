/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Job, JobType } from "../../src/types.js";
import { JobRepository } from "../repositories/JobRepository.js";
import { CharacterRepository } from "../repositories/CharacterRepository.js";
import { BookRepository } from "../repositories/BookRepository.js";
import { promptEngine } from "../providers/PromptEngine.js";
import { geminiProvider } from "../providers/GeminiProvider.js";
import { openaiProvider } from "../providers/OpenAIProvider.js";
import { storyLibraryService } from "./StoryLibraryService.js";
import { db } from "../database/db.js";

export class QueueService {
  private activeJobsCount = 0;
  private readonly maxConcurrency = 2; // Process 2 jobs concurrently
  private isProcessing = false;

  constructor(
    private jobRepo: JobRepository,
    private characterRepo: CharacterRepository,
    private bookRepo: BookRepository
  ) {
    // Start background processor loop
    setInterval(() => this.processQueue(), 2000);
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
        if (job.type === JobType.CHARACTER_SHEET) {
          await this.executeCharacterSheetJob(job);
        } else if (job.type === JobType.STORY) {
          await this.executeStoryJob(job);
        } else if (job.type === JobType.IMAGE) {
          await this.executeImageJob(job);
        } else if (job.type === JobType.PDF) {
          await this.executePDFJob(job);
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
        } else {
          // Linear backoff wait
          await new Promise((resolve) => setTimeout(resolve, attempts * 1000));
        }
      }
    }
  }

  /**
   * Generates a persistent character reference sheet
   */
  private async executeCharacterSheetJob(job: Job) {
    const { characterId } = job.payload;
    const char = await this.characterRepo.findById(characterId);
    if (!char) throw new Error(`Character ${characterId} not found.`);

    await this.jobRepo.update(job.id, { progress: 30 });

    // Build a detailed visual profile of the child from custom attributes
    let visualDetails = char.description || "";
    const attributes: string[] = [];
    if (char.hairStyle || char.hairColor) {
      const hairDesc = [char.hairStyle, char.hairColor].filter(Boolean).join(" ");
      attributes.push(`Hair: ${hairDesc}`);
    }
    if (char.eyeColor) {
      attributes.push(`Eyes: ${char.eyeColor}`);
    }
    if (char.skinTone) {
      attributes.push(`Skin Tone: ${char.skinTone}`);
    }
    if (char.clothingStyle) {
      attributes.push(`Clothing Style: ${char.clothingStyle}`);
    }
    if (char.accessories) {
      attributes.push(`Accessories: ${char.accessories}`);
    }
    if (char.personality) {
      attributes.push(`Personality / Traits: ${char.personality}`);
    }
    if (char.additionalNotes) {
      attributes.push(`Extra Details: ${char.additionalNotes}`);
    }

    if (attributes.length > 0) {
      visualDetails += "\n\nSpecific Visual Attributes to include:\n" + attributes.map(a => `- ${a}`).join("\n");
    }

    const prompt = promptEngine.generateCharacterPrompt(char.name, char.age, char.gender, visualDetails);
    
    // Call configured provider to generate the comprehensive reference sheet
    const imageProvider = db.settings?.imageProvider || "gemini";
    const sheetImage = imageProvider === "openai"
      ? await openaiProvider.generateCharacterSheet(prompt)
      : await geminiProvider.generateCharacterSheet(prompt);

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
   * Generates a book story structured text
   */
  private async executeStoryJob(job: Job) {
    const { bookId, templateId, style, childName, numberOfPages } = job.payload;
    
    const template = await this.bookRepo.findTemplateById(templateId);
    if (!template) throw new Error(`Story template ${templateId} not found.`);

    await this.jobRepo.update(job.id, { progress: 40 });

    const prompt = promptEngine.generateStoryPrompt(
      template.title,
      template.promptTemplate,
      style,
      childName,
      numberOfPages || template.numberOfPages
    );

    const textProvider = db.settings?.textProvider || "gemini";
    const jsonText = textProvider === "openai"
      ? await openaiProvider.generateText(prompt, "You are a specialized JSON child storybook creator.", true)
      : await geminiProvider.generateText(prompt, "You are a specialized JSON child storybook creator.", true);

    await this.jobRepo.update(job.id, { progress: 80 });

    let storyResult;
    try {
      // Clean potential json markdown wrapping
      const cleaned = jsonText.replace(/```json/gi, "").replace(/```/g, "").trim();
      storyResult = JSON.parse(cleaned);
    } catch (parseErr) {
      console.warn("Failed to parse Gemini JSON story, attempting cleanup fallback...", parseErr);
      throw new Error("Story generation output was not in valid structured JSON format.");
    }

    // Map result pages to BookPages structure
    const pages = storyResult.pages.map((p: any) => ({
      id: "page_" + Math.random().toString(36).substring(2, 11),
      pageNumber: p.pageNumber,
      storyText: p.storyText,
      illustrationPrompt: p.illustrationPrompt,
      imageStatus: "Queued",
      createdAt: new Date().toISOString()
    }));

    await this.bookRepo.update(bookId, {
      title: storyResult.title || `${childName}'s Adventure`,
      coverTitle: storyResult.coverTitle || "An AI Personalized Story Book",
      pages
    });

    await this.jobRepo.update(job.id, {
      status: "Completed",
      progress: 100,
      result: { bookId, pagesCount: pages.length }
    });
  }

  /**
   * Generates a single-page illustration using approved character reference views
   */
  private async executeImageJob(job: Job) {
    const { bookId, pageNumber } = job.payload;
    const book = await this.bookRepo.findById(bookId);
    if (!book) throw new Error(`Book ${bookId} not found.`);

    const page = book.pages.find(p => p.pageNumber === pageNumber);
    if (!page) throw new Error(`Book page ${pageNumber} not found.`);

    await this.bookRepo.updatePage(bookId, pageNumber, { imageStatus: "Generating" });
    await this.jobRepo.update(job.id, { progress: 30 });

    const imageProvider = db.settings?.imageProvider || "gemini";
    let imageUrl: string;

    if (book.libraryStoryId) {
      // Fixed-cast Story Library book: use the hand-authored prompt verbatim, conditioned
      // on the referenced characters' reference sheet images for visual consistency.
      const referenceImages = (page.characterKeys || [])
        .map((key) => storyLibraryService.getCharacterImageBase64(book.libraryStoryId!, key))
        .filter((ref): ref is { mime: string; data: string } => !!ref);

      await this.jobRepo.update(job.id, { progress: 50 });

      imageUrl = imageProvider === "openai"
        ? await openaiProvider.generateImageWithReferences(page.illustrationPrompt, referenceImages)
        : (imageProvider === "procedural"
            ? geminiProvider.createProceduralIllustration(page.illustrationPrompt, book.style)
            : await geminiProvider.generateImageWithReferences(page.illustrationPrompt, referenceImages, book.style));

      // Cache the render to the story template's own illustrations folder on disk so it
      // can be reused/inspected from the Story Library browser without regenerating.
      storyLibraryService.saveIllustration(book.libraryStoryId, pageNumber, imageUrl);
    } else {
      const char = await this.characterRepo.findById(book.characterId!);
      if (!char) throw new Error(`Character ${book.characterId} not found.`);

      // Fetch character sheet details for consistency context
      let sheetDetails = "Use a friendly cartoon styling with distinct features.";
      if (char.characterSheetId) {
        const sheet = await this.characterRepo.findSheetById(char.characterSheetId);
        if (sheet) {
          sheetDetails = "An approved character reference sheet is on file (three-view drawing, expression sheet, pose sheet, and costume design). Ensure hairstyle, clothes color palette, and face proportions match it exactly.";
        }
      }

      const imagePrompt = promptEngine.generateIllustrationPrompt(
        pageNumber,
        page.illustrationPrompt.replace(/MAIN_CHARACTER/g, book.childName),
        book.style,
        char.name,
        char.description,
        sheetDetails
      );

      await this.jobRepo.update(job.id, { progress: 50 });

      imageUrl = imageProvider === "openai"
        ? await openaiProvider.generateImage(imagePrompt, book.style)
        : (imageProvider === "procedural"
            ? geminiProvider.createProceduralIllustration(imagePrompt, book.style)
            : await geminiProvider.generateImage(imagePrompt, book.style));
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
