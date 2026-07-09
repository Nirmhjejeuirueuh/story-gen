/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from "express";

export class RequestValidator {
  public static validateUpload(req: Request, res: Response, next: NextFunction): void {
    const { photos } = req.body;
    if (!photos || !Array.isArray(photos) || photos.length < 3 || photos.length > 10) {
      res.status(400).json({ error: "Validation Failed: You must upload between 3 and 10 reference photos." });
      return;
    }
    next();
  }

  public static validateCharacter(req: Request, res: Response, next: NextFunction): void {
    const { name, age, gender, description } = req.body;
    if (!name || typeof name !== "string" || name.trim().length === 0) {
       res.status(400).json({ error: "Validation Failed: Character 'name' is required." });
       return;
    }
    if (!age || typeof age !== "number" || age <= 0 || age > 18) {
       res.status(400).json({ error: "Validation Failed: 'age' must be a valid number between 1 and 18." });
       return;
    }
    if (!gender || typeof gender !== "string") {
       res.status(400).json({ error: "Validation Failed: 'gender' is required." });
       return;
    }
    next();
  }

  public static validateBook(req: Request, res: Response, next: NextFunction): void {
    const { characterId, templateId, style, childName } = req.body;
    if (!characterId) {
       res.status(400).json({ error: "Validation Failed: 'characterId' is required to link character designs." });
       return;
    }
    if (!templateId) {
       res.status(400).json({ error: "Validation Failed: 'templateId' is required." });
       return;
    }
    if (!style) {
       res.status(400).json({ error: "Validation Failed: Illustration 'style' is required." });
       return;
    }
    if (!childName || typeof childName !== "string" || childName.trim().length === 0) {
       res.status(400).json({ error: "Validation Failed: 'childName' is required." });
       return;
    }
    next();
  }
}
