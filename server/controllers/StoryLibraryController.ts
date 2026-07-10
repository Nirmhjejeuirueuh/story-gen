/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from "express";
import { storyLibraryService } from "../services/StoryLibraryService.js";

export class StoryLibraryController {
  /**
   * Lists all filesystem-authored story library entries
   */
  public listStories = async (req: Request, res: Response): Promise<void> => {
    try {
      const stories = storyLibraryService.listStories();
      res.status(200).json(stories);
    } catch (error: any) {
      console.error("[StoryLibraryController] Error listing stories:", error);
      res.status(500).json({ error: "Failed to list story library: " + error.message });
    }
  };

  /**
   * Retrieves a single story library entry with its chapters and character roster
   */
  public getStory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const story = storyLibraryService.getStory(id);
      if (!story) {
        res.status(404).json({ error: "Story library entry not found." });
        return;
      }
      res.status(200).json(story);
    } catch (error: any) {
      console.error("[StoryLibraryController] Error fetching story:", error);
      res.status(500).json({ error: "Failed to fetch story library entry: " + error.message });
    }
  };

  /**
   * Streams a character reference sheet image directly from disk
   */
  public getCharacterImage = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, key } = req.params;
      const filePath = storyLibraryService.getCharacterImagePath(id, key);
      if (!filePath) {
        res.status(404).json({ error: "Character reference image not found." });
        return;
      }
      res.sendFile(filePath);
    } catch (error: any) {
      console.error("[StoryLibraryController] Error streaming character image:", error);
      res.status(500).json({ error: "Failed to load character image: " + error.message });
    }
  };
}
