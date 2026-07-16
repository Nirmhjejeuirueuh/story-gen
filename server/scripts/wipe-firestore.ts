/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Deletes all documents in the app data collections so the startup migration can re-run
 * cleanly. Does NOT touch the story library (that lives on disk + GCS). Run:
 *   npx tsx server/scripts/wipe-firestore.ts
 */

import { getFirestore } from "../database/firestore.js";

async function main() {
  const db = getFirestore();
  const collections = ["characters", "characterSheets", "books", "jobs", "templates", "settings"];
  for (const name of collections) {
    const snap = await db.collection(name).get();
    await Promise.all(snap.docs.map((d) => d.ref.delete()));
    console.log(`wiped ${name}: ${snap.size} docs`);
  }
  console.log("Firestore app collections cleared.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Wipe failed:", err.message || err);
  process.exit(1);
});
