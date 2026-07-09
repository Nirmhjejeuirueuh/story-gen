/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from "express";
import { BookRepository } from "../repositories/BookRepository.js";
import { JobRepository } from "../repositories/JobRepository.js";
import { QueueService } from "../services/QueueService.js";
import { JobType, Book, BookPage, StoryTemplate } from "../../src/types.js";

export class BookController {
  constructor(
    private bookRepo: BookRepository,
    private jobRepo: JobRepository,
    private queueService: QueueService
  ) {}

  /**
   * Creates a new book and queues background story outline generation
   */
  public createBook = async (req: Request, res: Response): Promise<void> => {
    try {
      const { characterId, templateId, style, childName, numberOfPages } = req.body;

      const book: Book = {
        id: "book_" + Math.random().toString(36).substring(2, 11),
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
   * Fetches all books
   */
  public getAllBooks = async (req: Request, res: Response): Promise<void> => {
    try {
      const list = await this.bookRepo.findAll();
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
      if (!book) {
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
      if (!book) {
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
      if (!book) {
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
      if (!book) {
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
      if (!book) {
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

  // Dynamic config templates
  public getTemplates = async (req: Request, res: Response): Promise<void> => {
    try {
      const templates = await this.bookRepo.getTemplates();
      res.status(200).json(templates);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to load templates: " + error.message });
    }
  };

  public saveTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, title, description, coverImage, ageRange, numberOfPages, promptTemplate } = req.body;
      if (!id || !title || !promptTemplate) {
        res.status(400).json({ error: "Fields 'id', 'title', and 'promptTemplate' are required." });
        return;
      }

      const template: StoryTemplate = {
        id,
        title,
        description: description || "",
        coverImage: coverImage || "📖",
        ageRange: ageRange || "3-6 years",
        numberOfPages: Number(numberOfPages) || 8,
        promptTemplate
      };

      const saved = await this.bookRepo.saveTemplate(template);
      res.status(200).json({
        message: "Template configured successfully.",
        template: saved
      });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to save template: " + error.message });
    }
  };

  public deleteTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const deleted = await this.bookRepo.deleteTemplate(id);
      if (!deleted) {
        res.status(404).json({ error: "Template not found." });
        return;
      }
      res.status(200).json({ message: "Template deleted successfully." });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete template: " + error.message });
    }
  };
}
