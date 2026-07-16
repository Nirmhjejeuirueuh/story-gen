/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Book, BookPage, StoryTemplate } from "../../src/types.js";
import { db } from "../database/db.js";

export class BookRepository {
  public async create(book: Book): Promise<Book> {
    db.books.push(book);
    await db.upsert("books", book.id, book);
    return book;
  }

  public async findById(id: string): Promise<Book | null> {
    const book = db.books.find(b => b.id === id);
    return book || null;
  }

  public async findAll(): Promise<Book[]> {
    return [...db.books];
  }

  public async update(id: string, updates: Partial<Book>): Promise<Book | null> {
    const index = db.books.findIndex(b => b.id === id);
    if (index === -1) return null;

    db.books[index] = {
      ...db.books[index],
      ...updates
    };
    await db.upsert("books", id, db.books[index]);
    return db.books[index];
  }

  public async delete(id: string): Promise<boolean> {
    const initialLength = db.books.length;
    db.books = db.books.filter(b => b.id !== id);
    await db.remove("books", id);
    return db.books.length < initialLength;
  }

  public async updatePage(bookId: string, pageNumber: number, updates: Partial<BookPage>): Promise<BookPage | null> {
    const book = db.books.find(b => b.id === bookId);
    if (!book) return null;

    const pageIndex = book.pages.findIndex(p => p.pageNumber === pageNumber);
    if (pageIndex === -1) return null;

    book.pages[pageIndex] = {
      ...book.pages[pageIndex],
      ...updates
    };
    // Pages are stored as an array field on the book document, so persist the whole book.
    await db.upsert("books", bookId, book);
    return book.pages[pageIndex];
  }

  // Story Templates Operations
  public async getTemplates(): Promise<StoryTemplate[]> {
    return [...db.templates];
  }

  public async findTemplateById(id: string): Promise<StoryTemplate | null> {
    const template = db.templates.find(t => t.id === id);
    return template || null;
  }

  public async saveTemplate(template: StoryTemplate): Promise<StoryTemplate> {
    const index = db.templates.findIndex(t => t.id === template.id);
    if (index !== -1) {
      db.templates[index] = template;
    } else {
      db.templates.push(template);
    }
    await db.upsert("templates", template.id, template);
    return template;
  }

  public async deleteTemplate(id: string): Promise<boolean> {
    const initialLength = db.templates.length;
    db.templates = db.templates.filter(t => t.id !== id);
    await db.remove("templates", id);
    return db.templates.length < initialLength;
  }
}
