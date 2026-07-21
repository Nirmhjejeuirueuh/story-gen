/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Adds any cast members that exist on disk (server/stories/<id>/charators/*.md|png) but are
 * missing from that story's `characters` subcollection in Firestore. The one-time
 * `seedFromFilesystem` startup seed only runs when a story has never been seeded before, so cast
 * members added to disk later (a new character.md file) never reach Firestore on their own —
 * and the frontend Story Library only ever reads the Firestore-backed template cache.
 *
 * Run:  npx tsx server/scripts/sync-story-characters.ts
 */

import dotenv from "dotenv";
dotenv.config();

import { storyLibraryService } from "../services/StoryLibraryService.js";
import { templateStore } from "../services/TemplateStore.js";

async function main() {
  const stories = storyLibraryService.listStories();
  let totalAdded = 0;

  for (const story of stories) {
    const added = await templateStore.syncMissingCharacters(story.id);
    if (added.length > 0) {
      console.log(`${story.id}: added ${added.join(", ")}`);
      totalAdded += added.length;
    }
  }

  console.log(totalAdded > 0 ? `\nDone — synced ${totalAdded} character(s).` : "\nNothing to sync — all stories already up to date.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Sync failed:", err.message || err);
  process.exit(1);
});
