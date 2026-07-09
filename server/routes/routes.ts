/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Router, Request, Response } from "express";
import { UploadController } from "../controllers/UploadController.js";
import { CharacterController } from "../controllers/CharacterController.js";
import { BookController } from "../controllers/BookController.js";
import { CharacterRepository } from "../repositories/CharacterRepository.js";
import { BookRepository } from "../repositories/BookRepository.js";
import { JobRepository } from "../repositories/JobRepository.js";
import { QueueService } from "../services/QueueService.js";
import { RequestValidator } from "../validators/validation.js";
import { db } from "../database/db.js";

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

// File Uploads
router.post("/upload", RequestValidator.validateUpload, (req, res) => uploadController.uploadPhotos(req, res));

// Characters and Sheet Managers
router.post("/characters", RequestValidator.validateCharacter, characterController.createCharacter);
router.get("/characters", characterController.getAllCharacters);
router.get("/characters/:id", characterController.getCharacterById);
router.delete("/characters/:id", characterController.deleteCharacter);
router.get("/characters/:id/sheet", characterController.getCharacterSheetByCharacterId);
router.post("/character-sheet/:id/approve", characterController.approveCharacterSheet);

// Books Management
router.post("/books", RequestValidator.validateBook, bookController.createBook);
router.get("/books", bookController.getAllBooks);
router.get("/books/:id", bookController.getBookById);
router.put("/books/:id", bookController.updateBook);
router.delete("/books/:id", bookController.deleteBook);
router.get("/books/:id/pages", bookController.getBookPages);

// Page Render batch / single
router.post("/books/:id/generate", bookController.generateIllustrations);
router.post("/pages/regenerate", bookController.regeneratePageIllustration);
router.post("/books/:id/export", bookController.exportBook);

// Configurable Templates Manager
router.get("/templates", bookController.getTemplates);
router.post("/templates", bookController.saveTemplate);
router.delete("/templates/:id", bookController.deleteTemplate);

// System Settings Manager
router.get("/settings", (req, res) => {
  try {
    res.status(200).json(db.settings);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to load settings: " + error.message });
  }
});

router.post("/settings", (req, res) => {
  try {
    const { textProvider, imageProvider, geminiApiKey, openaiApiKey, openaiModel, openaiImageModel } = req.body;
    db.settings = {
      textProvider: textProvider || "gemini",
      imageProvider: imageProvider || "gemini",
      geminiApiKey: geminiApiKey || "",
      openaiApiKey: openaiApiKey || "",
      openaiModel: openaiModel || "gpt-4o-mini",
      openaiImageModel: openaiImageModel || "gpt-image-1"
    };
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
