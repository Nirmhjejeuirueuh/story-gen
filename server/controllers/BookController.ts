/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from "express";
import { BookRepository } from "../repositories/BookRepository.js";
import { JobRepository } from "../repositories/JobRepository.js";
import { CharacterRepository } from "../repositories/CharacterRepository.js";
import { QueueService } from "../services/QueueService.js";
import { storyLibraryService } from "../services/StoryLibraryService.js";
import { storyLibraryController } from "./StoryLibraryController.js";
import { JobType, Book, BookPage, IllustrationStyle } from "../../src/types.js";
import { AuthedRequest } from "../middleware/auth.js";
import { DEFAULT_STYLE_ID, getStyle } from "../config/styles.js";
import { getProtagonistName, personalizeStoryText } from "../config/protagonists.js";

export class BookController {
  constructor(
    private bookRepo: BookRepository,
    private jobRepo: JobRepository,
    private queueService: QueueService,
    private characterRepo: CharacterRepository
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
   * Creates a book directly from a Story Library entry, using the story's pre-generated
   * TEMPLATE pages (story text + layout + illustration prompt, with text baked into the image at
   * generation time — see StoryLibraryController). If the story has no generated pages yet, they
   * are generated now (auto-generate on first use) rather than requiring an admin step first.
   *
   * Generic books (no characterId) reuse the template's already-rendered page image directly —
   * instant, no Gemini spend. Personalized books (characterId set) need the child's face baked
   * into a fresh render, so each page is queued as an IMAGE job (see QueueService.executeImageJob).
   */
  public createBookFromLibrary = async (req: Request, res: Response): Promise<void> => {
    try {
      const { libraryStoryId, characterId, childName, styleId } = req.body;
      if (!libraryStoryId) {
        res.status(400).json({ error: "Field 'libraryStoryId' is required." });
        return;
      }

      const story = storyLibraryService.getStory(libraryStoryId);
      if (!story) {
        res.status(404).json({ error: "Story library entry not found." });
        return;
      }

      const style = getStyle(styleId);
      const templatePages = await storyLibraryController.ensurePagesGenerated(libraryStoryId);
      const isPersonalized = !!characterId;

      const castNames = story.characters.map((c) => c.displayName).join(", ");

      // Hero personalization (optional): when a characterId + childName are supplied, the
      // uploaded user stars as the story's MAIN_CHARACTER hero. Their photo/sheet conditions
      // the illustrations and their name fills the narrative. Left blank => generic stock book.
      const heroName = typeof childName === "string" ? childName.trim() : "";

      // The template pages are authored with the ORIGINAL protagonist's real name baked in (the
      // "Generate Pages" model writes "Thumbelina", not a MAIN_CHARACTER token), so a personalized
      // book must substitute the child's name into the text it STORES — otherwise Book Preview,
      // the page editor and the exported PDF would all still read "Thumbelina" even though the
      // illustrations feature the child.
      const protagonistName = getProtagonistName(libraryStoryId, story.characters);
      const personalizeIfHero = (text: string) =>
        isPersonalized && heroName ? personalizeStoryText(text, protagonistName, heroName) : text;

      const pages: BookPage[] = templatePages.map((tp) => {
        // A generic (non-personalized) book reuses the TEMPLATE page's image for the requested
        // style specifically — a non-default style's cached image lives in `imageUrls`, not the
        // legacy singular `imageUrl` field (which is the default style's mirror only).
        const cachedImage = style.id === DEFAULT_STYLE_ID ? tp.imageUrl : tp.imageUrls?.[style.id];
        const reusable = !isPersonalized && !!cachedImage;
        return {
          id: "page_" + Math.random().toString(36).substring(2, 11),
          pageNumber: tp.pageNumber,
          storyText: personalizeIfHero(tp.storyText),
          illustrationPrompt: personalizeIfHero(tp.illustrationPrompt),
          characterKeys: tp.characterKeys,
          layoutId: tp.layoutId,
          imageUrl: reusable ? cachedImage : undefined,
          imageStatus: reusable ? "Completed" : "Queued",
          createdAt: new Date().toISOString()
        };
      });

      // If this book is rendered in a non-default style and has a hero, re-render the hero's
      // reference sheet in THAT style once now — otherwise every page would fight between the
      // book's chosen art style and a hero reference still drawn in whatever style the
      // character's own (shared, reused-across-books) sheet happens to be in. Stored on the BOOK,
      // not the Character, so this never touches the character's original sheet used elsewhere.
      let heroStyledSheetUrl: string | undefined;
      if (isPersonalized && style.id !== DEFAULT_STYLE_ID) {
        const hero = await this.characterRepo.findById(characterId);
        if (hero) {
          try {
            heroStyledSheetUrl = await this.queueService.generateHeroReferenceSheet(hero, style);
          } catch (err: any) {
            console.error(`[BookController] Failed to render hero sheet in style ${style.id}, falling back to the character's default sheet:`, err.message);
          }
        }
      }

      const book: Book = {
        id: "book_" + Math.random().toString(36).substring(2, 11),
        ownerId: (req as AuthedRequest).uid,
        title: story.title,
        coverTitle: story.title,
        characterId: characterId || undefined,
        templateId: story.id,
        libraryStoryId: story.id,
        style: IllustrationStyle.STORYBOOK,
        styleId: style.id,
        heroStyledSheetUrl,
        childName: heroName || castNames || story.title,
        pages,
        createdAt: new Date().toISOString()
      };

      const saved = await this.bookRepo.create(book);
      console.log(`[BookController] Storybook created from library entry: ${saved.id} (${story.id})`);

      // Queue image rendering for every page that couldn't reuse a template image (all pages if
      // personalized; only not-yet-rendered pages if generic — e.g. the story's very first book).
      for (const page of pages) {
        if (page.imageStatus === "Queued") {
          await this.queueService.addJob(JobType.IMAGE, { bookId: saved.id, pageNumber: page.pageNumber });
        }
      }

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

}
