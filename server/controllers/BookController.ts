/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from "express";
import { BookRepository } from "../repositories/BookRepository.js";
import { JobRepository } from "../repositories/JobRepository.js";
import { QueueService } from "../services/QueueService.js";
import { storyLibraryService } from "../services/StoryLibraryService.js";
import { JobType, Book, BookPage, IllustrationStyle } from "../../src/types.js";
import { AuthedRequest } from "../middleware/auth.js";

export class BookController {
  constructor(
    private bookRepo: BookRepository,
    private jobRepo: JobRepository,
    private queueService: QueueService
  ) {}

  /**
   * READ access: any authenticated user may VIEW every generated storybook. This is a shared
   * gallery — the app is used only by the owner and his mentor, who both want to see all books.
   */
  private canReadBook(_book: Book, req: AuthedRequest): boolean {
    return !!req.uid;
  }

  /**
   * MODIFY access (edit / delete / regenerate): any signed-in user, regardless of who created
   * the book — this is a two-person shared pet project, not a multi-tenant app, and both people
   * should be able to manage every book. `ownerId` is still recorded on creation for attribution,
   * it just no longer gates actions.
   */
  private canModifyBook(_book: Book, req: AuthedRequest): boolean {
    return !!req.uid;
  }

  /**
   * Creates a new book and queues background story outline generation
   */
  public createBook = async (req: Request, res: Response): Promise<void> => {
    try {
      const { characterId, templateId, style, childName, numberOfPages } = req.body;

      const book: Book = {
        id: "book_" + Math.random().toString(36).substring(2, 11),
        ownerId: (req as AuthedRequest).uid,
        title: `${childName}'s Adventure`,
        coverTitle: "Personalized Storybook",
        characterId,
        templateId,
        style,
        childName,
        pages: [], // Populated in the background by Story job
        createdAt: new Date().toISOString()
      };

      const saved = await this.bookRepo.create(book);
      console.log(`[BookController] Book shell created: ${saved.id}. Queuing story generation...`);

      // Queue background job to generate story text and illustration prompts
      const job = await this.queueService.addJob(JobType.STORY, {
        bookId: saved.id,
        templateId,
        style,
        childName,
        numberOfPages: numberOfPages || 8
      });

      res.status(210).json({
        message: "Book created and story generation job initialized.",
        book: saved,
        jobId: job.id
      });
    } catch (error: any) {
      console.error("[BookController] Error creating book:", error);
      res.status(500).json({ error: "Failed to create book: " + error.message });
    }
  };

  /**
   * Re-queues story text generation for an existing book (e.g. after a failed attempt)
   */
  public regenerateStoryText = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const book = await this.bookRepo.findById(id);
      if (!book || !this.canModifyBook(book, req as AuthedRequest)) {
        res.status(404).json({ error: "Book not found." });
        return;
      }

      const job = await this.queueService.addJob(JobType.STORY, {
        bookId: book.id,
        templateId: book.templateId,
        style: book.style,
        childName: book.childName,
        numberOfPages: 8
      });

      res.status(202).json({
        message: "Story generation re-queued.",
        jobId: job.id
      });
    } catch (error: any) {
      console.error("[BookController] Error regenerating story text:", error);
      res.status(500).json({ error: "Failed to regenerate story text: " + error.message });
    }
  };

  /**
   * Creates a book directly from a fixed-cast filesystem Story Library entry.
   * No personalized character, style choice, or AI text generation is involved -
   * pages are built synchronously from the hand-authored chapter illustration prompts.
   */
  public createBookFromLibrary = async (req: Request, res: Response): Promise<void> => {
    try {
      const { libraryStoryId, characterId, childName } = req.body;
      if (!libraryStoryId) {
        res.status(400).json({ error: "Field 'libraryStoryId' is required." });
        return;
      }

      const story = storyLibraryService.getStory(libraryStoryId);
      if (!story) {
        res.status(404).json({ error: "Story library entry not found." });
        return;
      }

      const pages: BookPage[] = story.chapters.map((chapter) => ({
        id: "page_" + Math.random().toString(36).substring(2, 11),
        pageNumber: chapter.pageNumber,
        storyText: chapter.storyText,
        illustrationPrompt: chapter.illustrationPrompt,
        characterKeys: chapter.characterKeys,
        imageStatus: "Queued",
        createdAt: new Date().toISOString()
      }));

      const castNames = story.characters.map((c) => c.displayName).join(", ");

      // Hero personalization (optional): when a characterId + childName are supplied, the
      // uploaded user stars as the story's MAIN_CHARACTER hero. Their photo/sheet conditions
      // the illustrations and their name fills the narrative. Left blank => generic stock book.
      const heroName = typeof childName === "string" ? childName.trim() : "";

      const book: Book = {
        id: "book_" + Math.random().toString(36).substring(2, 11),
        ownerId: (req as AuthedRequest).uid,
        title: story.title,
        coverTitle: story.title,
        characterId: characterId || undefined,
        templateId: story.id,
        libraryStoryId: story.id,
        style: IllustrationStyle.STORYBOOK,
        childName: heroName || castNames || story.title,
        pages,
        createdAt: new Date().toISOString()
      };

      const saved = await this.bookRepo.create(book);
      console.log(`[BookController] Storybook created from library entry: ${saved.id} (${story.id})`);

      res.status(201).json({
        message: "Storybook created from story library template.",
        book: saved
      });
    } catch (error: any) {
      console.error("[BookController] Error creating book from library:", error);
      res.status(500).json({ error: "Failed to create book from story library: " + error.message });
    }
  };

  /**
   * Fetches all books
   */
  public getAllBooks = async (req: Request, res: Response): Promise<void> => {
    try {
      const auth = req as AuthedRequest;
      const all = await this.bookRepo.findAll();
      const list = all.filter((b) => this.canReadBook(b, auth));
      res.status(200).json(list);
    } catch (error: any) {
      console.error("[BookController] Error fetching books:", error);
      res.status(500).json({ error: "Failed to list books: " + error.message });
    }
  };

  /**
   * Retrieves specific book details
   */
  public getBookById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const book = await this.bookRepo.findById(id);
      if (!book || !this.canReadBook(book, req as AuthedRequest)) {
        res.status(404).json({ error: "Book not found." });
        return;
      }
      res.status(200).json(book);
    } catch (error: any) {
      console.error("[BookController] Error fetching book:", error);
      res.status(500).json({ error: "Failed to fetch book: " + error.message });
    }
  };

  /**
   * Retrieves pages of a specific book
   */
  public getBookPages = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const book = await this.bookRepo.findById(id);
      if (!book || !this.canReadBook(book, req as AuthedRequest)) {
        res.status(404).json({ error: "Book not found." });
        return;
      }
      res.status(200).json(book.pages);
    } catch (error: any) {
      console.error("[BookController] Error fetching pages:", error);
      res.status(500).json({ error: "Failed to list book pages: " + error.message });
    }
  };

  /**
   * Updates general book parameters or page data
   */
  public updateBook = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { title, coverTitle, pages } = req.body;

      const existing = await this.bookRepo.findById(id);
      if (!existing || !this.canModifyBook(existing, req as AuthedRequest)) {
        res.status(404).json({ error: "Book not found." });
        return;
      }

      const updated = await this.bookRepo.update(id, { title, coverTitle, pages });
      if (!updated) {
        res.status(404).json({ error: "Book not found." });
        return;
      }

      res.status(200).json({
        message: "Book metadata and contents updated successfully.",
        book: updated
      });
    } catch (error: any) {
      console.error("[BookController] Error updating book:", error);
      res.status(500).json({ error: "Failed to update book: " + error.message });
    }
  };

  /**
   * Triggers illustration generation jobs for all queued or failed pages of a book
   */
  public generateIllustrations = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const book = await this.bookRepo.findById(id);
      if (!book || !this.canModifyBook(book, req as AuthedRequest)) {
        res.status(404).json({ error: "Book not found." });
        return;
      }

      const jobsQueued = [];
      for (const page of book.pages) {
        if (page.imageStatus === "Queued" || page.imageStatus === "Failed") {
          // Trigger queue task for this single page
          const job = await this.queueService.addJob(JobType.IMAGE, {
            bookId: book.id,
            pageNumber: page.pageNumber
          });
          jobsQueued.push({ pageNumber: page.pageNumber, jobId: job.id });
          
          // Set status in DB to indicate it is waiting in queue
          await this.bookRepo.updatePage(book.id, page.pageNumber, { imageStatus: "Queued" });
        }
      }

      res.status(200).json({
        message: `${jobsQueued.length} illustration tasks queued successfully in background.`,
        queuedJobs: jobsQueued
      });
    } catch (error: any) {
      console.error("[BookController] Error batch generating images:", error);
      res.status(500).json({ error: "Failed to start image generation batch: " + error.message });
    }
  };

  /**
   * Explicitly regenerates an illustration for a single page
   */
  public regeneratePageIllustration = async (req: Request, res: Response): Promise<void> => {
    try {
      const { bookId, pageNumber } = req.body;
      const book = await this.bookRepo.findById(bookId);
      if (!book || !this.canModifyBook(book, req as AuthedRequest)) {
        res.status(404).json({ error: "Book not found." });
        return;
      }

      const pageIndex = book.pages.findIndex(p => p.pageNumber === Number(pageNumber));
      if (pageIndex === -1) {
        res.status(404).json({ error: "Page not found." });
        return;
      }

      // Mark status as Queued and queue the job
      await this.bookRepo.updatePage(bookId, Number(pageNumber), { imageStatus: "Queued", imageError: undefined });
      const job = await this.queueService.addJob(JobType.IMAGE, {
        bookId,
        pageNumber: Number(pageNumber)
      });

      res.status(200).json({
        message: `Regeneration job successfully queued for page ${pageNumber}.`,
        jobId: job.id
      });
    } catch (error: any) {
      console.error("[BookController] Error regenerating page illustration:", error);
      res.status(500).json({ error: "Failed to queue single illustration: " + error.message });
    }
  };

  /**
   * Saves (or clears) a page's manual text-position override from the Book Preview layout
   * editor. Confined to "top" | "bottom" — a reserved zone, never over the illustration — so
   * the fixed 1:1 print canvas can never be put at risk. `textZone: null` resets the page back
   * to automatic alternation.
   */
  public updatePageLayout = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, pageNumber } = req.params;
      const { textZone } = req.body;
      if (textZone !== "top" && textZone !== "bottom" && textZone !== null) {
        res.status(400).json({ error: "Field 'textZone' must be 'top', 'bottom', or null." });
        return;
      }

      const book = await this.bookRepo.findById(id);
      if (!book || !this.canModifyBook(book, req as AuthedRequest)) {
        res.status(404).json({ error: "Book not found." });
        return;
      }

      const pageNum = Number(pageNumber);
      const page = book.pages.find((p) => p.pageNumber === pageNum);
      if (!page) {
        res.status(404).json({ error: "Page not found." });
        return;
      }

      const updated = await this.bookRepo.updatePage(id, pageNum, { textZone: textZone ?? undefined });

      res.status(200).json({
        message: textZone ? `Layout saved for page ${pageNum}.` : `Layout reset to automatic for page ${pageNum}.`,
        page: updated
      });
    } catch (error: any) {
      console.error("[BookController] Error updating page layout:", error);
      res.status(500).json({ error: "Failed to update page layout: " + error.message });
    }
  };

  /**
   * Initiates print-ready PDF export job
   */
  public exportBook = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const book = await this.bookRepo.findById(id);
      // Exporting only reads the book (produces a downloadable PDF), so anyone who can view it
      // may export it — lets the mentor download books to look at.
      if (!book || !this.canReadBook(book, req as AuthedRequest)) {
        res.status(404).json({ error: "Book not found." });
        return;
      }

      const job = await this.queueService.addJob(JobType.PDF, {
        bookId: book.id
      });

      res.status(200).json({
        message: "PDF export and image ZIP compiling job initialized.",
        jobId: job.id
      });
    } catch (error: any) {
      console.error("[BookController] Error initializing export:", error);
      res.status(500).json({ error: "Failed to queue export task: " + error.message });
    }
  };

  /**
   * Deletes a book
   */
  public deleteBook = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const existing = await this.bookRepo.findById(id);
      if (!existing || !this.canModifyBook(existing, req as AuthedRequest)) {
        res.status(404).json({ error: "Book not found." });
        return;
      }
      const deleted = await this.bookRepo.delete(id);
      if (!deleted) {
        res.status(404).json({ error: "Book not found." });
        return;
      }
      res.status(200).json({ message: "Book and page content deleted successfully." });
    } catch (error: any) {
      console.error("[BookController] Error deleting book:", error);
      res.status(500).json({ error: "Failed to delete book: " + error.message });
    }
  };

  // Story-book template catalogue — read-only; feeds the custom photo-book wizard's template
  // picker. (The old admin CRUD UI for authoring templates was unreachable dead code and has
  // been removed; templates are seeded from DEFAULT_TEMPLATES in server/database/db.ts.)
  public getTemplates = async (req: Request, res: Response): Promise<void> => {
    try {
      const templates = await this.bookRepo.getTemplates();
      res.status(200).json(templates);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to load templates: " + error.message });
    }
  };
}
