/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from "express";

export class UploadController {
  /**
   * Handles multi-photo upload requests
   */
  public async uploadPhotos(req: Request, res: Response): Promise<void> {
    try {
      const { photos } = req.body; // Array of base64 strings
      
      console.log(`[UploadController] Received ${photos.length} photos for processing.`);
      
      // Map base64 photos to response formats
      const result = photos.map((photo: string, index: number) => {
        // Return a mock path or keep the base64, which is extremely robust in this context
        return {
          id: `photo_${Date.now()}_${index}`,
          url: photo.startsWith("data:") ? photo : `data:image/jpeg;base64,${photo}`,
          size: Math.round(photo.length * 0.75),
          name: `uploaded_ref_photo_${index + 1}.jpg`
        };
      });

      res.status(200).json({
        message: "Photos uploaded and ready for consistent character analysis.",
        files: result
      });
    } catch (error: any) {
      console.error("[UploadController] Error handling photo upload:", error);
      res.status(500).json({ error: "Failed to upload and parse photos: " + error.message });
    }
  }
}
