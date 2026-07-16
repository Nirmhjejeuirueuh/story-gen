/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * One-off connectivity check: writes a doc, reads it back, deletes it.
 * Run with: npx tsx server/scripts/test-firestore.ts
 */

import { getFirestore } from "../database/firestore.js";

async function main() {
  const db = getFirestore();
  const ref = db.collection("_healthcheck").doc("ping");

  const stamp = new Date().toISOString();
  await ref.set({ ok: true, at: stamp });
  console.log("WRITE ok");

  const snap = await ref.get();
  console.log("READ ok:", JSON.stringify(snap.data()));

  await ref.delete();
  console.log("DELETE ok");

  console.log("\n✅ Firestore connection working end-to-end.");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Firestore test failed:", err.message || err);
  process.exit(1);
});
