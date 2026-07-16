/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * One-off: create (if needed) the GCS bucket for storybook images and verify access.
 * Also confirms billing is active — bucket creation fails on a non-billed project.
 * Run with: npx tsx server/scripts/create-bucket.ts
 */

import { Storage } from "@google-cloud/storage";
import path from "path";

const BUCKET = process.env.GCS_BUCKET || "storygen-6e3af-images";
const LOCATION = "us-central1"; // free-tier eligible region

async function main() {
  const storage = new Storage({
    keyFilename: path.join(process.cwd(), "server", "serviceAccountKey.json"),
  });

  const bucket = storage.bucket(BUCKET);
  const [exists] = await bucket.exists();

  if (exists) {
    console.log(`Bucket "${BUCKET}" already exists.`);
  } else {
    console.log(`Creating bucket "${BUCKET}" in ${LOCATION}...`);
    await storage.createBucket(BUCKET, {
      location: LOCATION,
      storageClass: "STANDARD",
      // Uniform bucket-level access (modern default; no per-object ACLs).
      iamConfiguration: { uniformBucketLevelAccess: { enabled: true } },
    });
    console.log("Bucket created.");
  }

  // Prove read/write with a tiny test object.
  const testFile = bucket.file("_healthcheck.txt");
  await testFile.save(`ok ${new Date().toISOString()}`, { contentType: "text/plain" });
  console.log("WRITE ok");
  const [contents] = await testFile.download();
  console.log("READ ok:", contents.toString());
  await testFile.delete();
  console.log("DELETE ok");

  console.log(`\n✅ GCS bucket "${BUCKET}" is ready and writable.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ GCS setup failed:", err.message || err);
  if (String(err.message).includes("billing")) {
    console.error("→ Billing may not be active yet, or hasn't propagated. Wait a minute and retry.");
  }
  process.exit(1);
});
