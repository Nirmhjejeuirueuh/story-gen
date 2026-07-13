/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * For each story's fixed cast:
 *   1. Writes a per-character description file on disk: server/stories/<id>/charators/<key>.md
 *      (the Alice pattern — this DEFINES the cast and documents each character).
 *   2. Generates a clean reference image (in the shared HOUSE_STYLE) and uploads it to GCS at
 *      casts/<storyId>/<key>.<ext>. Images live in the cloud, not the repo.
 *
 * Those references are passed into every page's generation so supporting characters stay
 * visually identical across the whole story. Skips characters that already have a cloud image
 * unless --force is passed. Run:  npx tsx server/scripts/generate-casts.ts [--force]
 */

import { geminiProvider } from "../providers/GeminiProvider.js";
import { storageService } from "../services/StorageService.js";
import { HOUSE_STYLE } from "../config/config.js";
import { IllustrationStyle } from "../../src/types.js";
import fs from "fs";
import path from "path";

const casts: Record<string, { key: string; desc: string }[]> = {
  "t10-the-jungle-book": [
    { key: "baloo", desc: "Baloo, a big friendly sleepy brown bear with kind eyes, a rounded belly and shaggy fur" },
    { key: "bagheera", desc: "Bagheera, a sleek elegant black panther with wise golden-green eyes and a graceful build" },
    { key: "shere khan", desc: "Shere Khan, a large fierce Bengal tiger with vivid orange fur, bold black stripes and piercing amber eyes" },
    { key: "mother wolf", desc: "a gentle protective grey mother wolf with soft warm eyes and thick fur" },
  ],
};

const storiesRoot = path.join(process.cwd(), "server", "stories");
const FORCE = process.argv.includes("--force");

function extFor(subtype: string): string {
  return subtype === "jpeg" ? "jpg" : subtype;
}

async function main() {
  for (const [storyId, members] of Object.entries(casts)) {
    const charDir = path.join(storiesRoot, storyId, "charators");
    fs.mkdirSync(charDir, { recursive: true });

    for (const m of members) {
      // 1. Description file on disk (defines the cast, documents the character).
      const mdPath = path.join(charDir, `${m.key}.md`);
      if (!fs.existsSync(mdPath) || FORCE) {
        fs.writeFileSync(mdPath, `${m.desc}\n`, "utf-8");
      }

      // 2. Reference image → GCS (skip if already there unless --force).
      const objectPrefix = `casts/${storyId}/${m.key}.`;
      const existing = await storageService.findObjectByPrefix(objectPrefix);
      if (existing && !FORCE) {
        console.log(`skip ${storyId}/${m.key} (cloud image exists)`);
        continue;
      }

      const prompt = `Full-body character reference of ${m.desc}. A single character standing in a clear neutral pose, facing forward, centered on a plain soft pastel background, friendly and appealing children's book character. ${HOUSE_STYLE}`;
      console.log(`generating ${storyId}/${m.key} ...`);
      const dataUri = await geminiProvider.generateImage(prompt, IllustrationStyle.WATERCOLOR);

      const match = /^data:image\/([a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUri);
      if (!match || match[1] === "svg+xml") {
        console.warn(`  ✗ no usable image for ${m.key}; skipping`);
        continue;
      }
      const [, subtype, b64] = match;
      const objectPath = `casts/${storyId}/${m.key}.${extFor(subtype)}`;
      await storageService.uploadBuffer(objectPath, Buffer.from(b64, "base64"), `image/${subtype}`);
      console.log(`  ✓ uploaded gs://.../${objectPath}`);
    }
  }
  console.log("\nCast generation complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Cast generation failed:", err.message || err);
  process.exit(1);
});
