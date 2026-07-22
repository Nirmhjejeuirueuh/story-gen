/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Router, Request, Response } from "express";
import { UploadController } from "../controllers/UploadController.js";
import { CharacterController } from "../controllers/CharacterController.js";
import { BookController } from "../controllers/BookController.js";
import { storyLibraryController } from "../controllers/StoryLibraryController.js";
import { CharacterRepository } from "../repositories/CharacterRepository.js";
import { BookRepository } from "../repositories/BookRepository.js";
import { JobRepository } from "../repositories/JobRepository.js";
import { QueueService } from "../services/QueueService.js";
import { RequestValidator } from "../validators/validation.js";
import { db } from "../database/db.js";
import { storageService } from "../services/StorageService.js";
import { authProtect, adminOnly, AuthedRequest } from "../middleware/auth.js";

const router = Router();

// 1. Instantiate Repositories
const characterRepo = new CharacterRepository();
const bookRepo = new BookRepository();
const jobRepo = new JobRepository();

// 2. Instantiate Services with DI
const queueService = new QueueService(jobRepo, characterRepo, bookRepo);

// 3. Instantiate Controllers with DI
const uploadController = new UploadController();
const characterController = new CharacterController(characterRepo, queueService);
const bookController = new BookController(bookRepo, jobRepo, queueService);

// --- REST ENDPOINTS MAP ---

// Image proxy — streams private GCS objects (illustrations, character sheets) to the browser.
// Stored image URLs look like /api/images/illustrations/<bookId>/<page>.png; this keeps the
// bucket private while letting <img src> load them directly.
router.get("/images/*", async (req: Request, res: Response) => {
  try {
    const objectPath = (req.params as unknown as string[])[0];
    await storageService.streamTo(objectPath, res);
  } catch (error: any) {
    if (!res.headersSent) res.status(500).json({ error: "Failed to load image: " + error.message });
  }
});

// Public story-library IMAGE endpoints. These serve stock (non-user) story-template artwork
// and are loaded via <img src>, which can't send an Authorization header — so, like the image
// proxy above, they must stay outside the auth gate. The story-library LIST/detail and
// regenerate routes below stay protected (they go through fetch, which carries the token).
router.get("/story-library/:id/characters/:key/image", storyLibraryController.getCharacterImage);

// --- AUTH GATE ---
// Everything below this line requires a valid Firebase ID token. The image routes above stay
// public because <img> tags can't send an Authorization header (paths are unguessable).
router.use(authProtect);

// Returns the signed-in caller's identity, including whether they are an admin (drives the
// frontend's admin-only System Settings tab).
router.get("/auth/me", (req: AuthedRequest, res: Response) => {
  res.status(200).json({ uid: req.uid, email: req.email, isAdmin: !!req.isAdmin });
});

// File Uploads
router.post("/upload", RequestValidator.validateUpload, (req, res) => uploadController.uploadPhotos(req, res));

// Characters and Sheet Managers
router.post("/characters", RequestValidator.validateCharacter, characterController.createCharacter);
router.get("/characters", characterController.getAllCharacters);
router.get("/characters/:id", characterController.getCharacterById);
router.delete("/characters/:id", characterController.deleteCharacter);
router.get("/characters/:id/sheet", characterController.getCharacterSheetByCharacterId);
router.post("/characters/:id/regenerate-sheet", characterController.regenerateCharacterSheet);
router.post("/character-sheet/:id/approve", characterController.approveCharacterSheet);

// Fixed-cast Story Library (filesystem-authored story templates under server/stories/).
// The two image-serving GET routes are registered above the auth gate (public, <img>-loaded).
router.get("/styles", storyLibraryController.listStyles);
router.get("/story-library", storyLibraryController.listStories);
router.get("/story-library/:id", storyLibraryController.getStory);
router.get("/story-library/:id/characters/:key", storyLibraryController.getCharacterDetail);
router.post("/story-library/:id/characters/:key/regenerate-sheet", storyLibraryController.regenerateCastSheet);
router.post("/story-library/:id/styles/:styleId/generate-cast", storyLibraryController.generateCastForStyle);

// REDESIGN: template page generation + per-page editor + image generation. The shared story
// templates are collaboratively editable by any signed-in user (owner + mentor), not admin-gated.
router.get("/layouts", storyLibraryController.listLayouts);
router.get("/story-library/:id/pages", storyLibraryController.getPages);
router.post("/story-library/:id/generate-pages", storyLibraryController.generatePages);
router.patch("/story-library/:id/pages/:pageNumber", storyLibraryController.updatePage);
router.post("/story-library/:id/pages/:pageNumber/generate-image", storyLibraryController.generatePageImage);

// Books Management
router.post("/books/from-library", bookController.createBookFromLibrary);
router.get("/books", bookController.getAllBooks);
router.get("/books/:id", bookController.getBookById);
router.put("/books/:id", bookController.updateBook);
router.delete("/books/:id", bookController.deleteBook);
router.get("/books/:id/pages", bookController.getBookPages);

// Page Render batch / single
router.post("/books/:id/generate", bookController.generateIllustrations);
router.post("/pages/regenerate", bookController.regeneratePageIllustration);
router.post("/books/:id/export", bookController.exportBook);

// System Settings Manager — admin only (holds the shared Gemini/OpenAI API keys).
router.get("/settings", adminOnly, (req, res) => {
  try {
    res.status(200).json(db.settings);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to load settings: " + error.message });
  }
});

router.post("/settings", adminOnly, async (req, res) => {
  try {
    const { textProvider, imageProvider, geminiApiKey, openaiApiKey, openaiModel, openaiImageModel } = req.body;
    await db.setSettings({
      textProvider: textProvider || "gemini",
      imageProvider: imageProvider || "gemini",
      geminiApiKey: geminiApiKey || "",
      openaiApiKey: openaiApiKey || "",
      openaiModel: openaiModel || "gpt-4o-mini",
      openaiImageModel: openaiImageModel || "gpt-image-1"
    });
    res.status(200).json({ success: true, settings: db.settings });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to save settings: " + error.message });
  }
});

// Jobs Tracking
router.get("/jobs/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const job = await jobRepo.findById(id);
    if (!job) {
      res.status(404).json({ error: "Job trace not found." });
      return;
    }
    res.status(200).json(job);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch job trace: " + error.message });
  }
});

// All Active Jobs (Dashboard monitor)
router.get("/jobs", async (req: Request, res: Response) => {
  try {
    const list = await jobRepo.findAll();
    res.status(200).json(list);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to list jobs: " + error.message });
  }
});

export default router;
export { queueService, jobRepo, bookRepo, characterRepo };
