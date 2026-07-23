/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Pushes anything added to disk under server/stories/ into Firestore:
 *   1. whole STORIES that have no storyTemplates/{id} doc yet (a new story folder), and
 *   2. CAST MEMBERS missing from an existing story's `characters` subcollection.
 *
 * Both are needed because the one-time `seedFromFilesystem` startup seed only runs when the
 * storyTemplates collection is completely empty — so anything added to disk afterwards never
 * reaches Firestore on its own, and the frontend Story Library only ever reads the
 * Firestore-backed template cache.
 *
 * Run:  npx tsx server/scripts/sync-story-characters.ts
 */

import dotenv from "dotenv";
dotenv.config();

import { storyLibraryService } from "../services/StoryLibraryService.js";
import { templateStore } from "../services/TemplateStore.js";

async function main() {
  // New stories first, so their cast is already in place before the per-story character pass.
  const newStories = await templateStore.syncMissingStories();
  for (const id of newStories) console.log(`added story: ${id}`);

  const stories = storyLibraryService.listStories();
  let totalAdded = 0;

  for (const story of stories) {
    const added = await templateStore.syncMissingCharacters(story.id);
    if (added.length > 0) {
      console.log(`${story.id}: added ${added.join(", ")}`);
      totalAdded += added.length;
    }
  }

  const summary = [
    newStories.length > 0 ? `${newStories.length} story(ies)` : "",
    totalAdded > 0 ? `${totalAdded} character(s)` : "",
  ].filter(Boolean).join(" and ");
  console.log(summary ? `\nDone — synced ${summary}.` : "\nNothing to sync — everything already up to date.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Sync failed:", err.message || err);
  process.exit(1);
});
