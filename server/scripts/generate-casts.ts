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
  "t8-a-little-princess": [
    { key: "miss minchin", desc: "Miss Minchin, a tall stern boarding-school headmistress with a sharp face, tight grey hair in a bun and a dark severe high-collared dress" },
    { key: "becky", desc: "Becky, a small kind young scullery maid with a smudged apron, messy hair, rosy cheeks and a warm shy smile" },
    { key: "ram dass", desc: "Ram Dass, a gentle kind Indian manservant with warm eyes, wearing a colourful turban and a flowing robe" },
  ],
  "t16-the-wind-in-the-willows": [
    { key: "mole", desc: "Mole, a small gentle velvety black mole with a shy friendly face, wearing a little buttoned waistcoat" },
    { key: "ratty", desc: "Ratty the Water Rat, a cheerful brown water rat in a boating jacket who loves the river" },
    { key: "toad", desc: "Mr Toad, a plump boastful green toad in a fine checked coat and driving goggles" },
    { key: "badger", desc: "Badger, a large wise gruff kindly badger with a black-and-white striped face, in a worn brown coat" },
  ],
  "t17-pollyanna": [
    { key: "aunt polly", desc: "Aunt Polly, a stiff proper middle-aged woman with a stern face, hair in a tight bun and a plain dark high-collared dress" },
    { key: "nancy", desc: "Nancy, a cheerful young housemaid with rosy cheeks, a white mob cap, an apron and a kind smile" },
    { key: "john pendleton", desc: "Mr John Pendleton, a gruff lonely older gentleman with a grey beard, stern at first but later warm and kindly" },
    { key: "dr chilton", desc: "Dr Chilton, a gentle kind young town doctor with a friendly face, neat coat and a small black medical bag" },
  ],
  "t7-treasure-island": [
    { key: "billy bones", desc: "Billy Bones, a weathered old sea captain with a scarred face, a faded blue coat, a black tricorn hat and a battered sea chest" },
    { key: "captain smollett", desc: "Captain Smollett, a stern upright ship's captain in a smart navy coat and hat, holding a brass spyglass" },
    { key: "long john silver", desc: "Long John Silver, a charming one-legged sea cook with a wooden crutch, a colourful parrot on his shoulder and a sly friendly grin" },
    { key: "ben gunn", desc: "Ben Gunn, a ragged wild-haired marooned sailor in tattered goat-skin clothes with a kind wide-eyed weathered face" },
  ],
  "t14-robinson-crusoe": [
    { key: "friday", desc: "Friday, a kind brave young island companion with warm brown skin, a friendly smile and simple woven island clothes" },
    { key: "parrot", desc: "a bright colourful tropical parrot with red, blue and yellow feathers" },
  ],
  "t20-the-call-of-the-wild": [
    { key: "buck", desc: "Buck, a huge magnificent loyal sled dog, part St Bernard, with thick tawny-brown fur and intelligent warm eyes" },
    { key: "john thornton", desc: "John Thornton, a kind rugged gold-prospector with a warm bearded face and a fur-lined winter coat" },
  ],
  "t12-the-ugly-duckling": [
    { key: "ugly duckling", desc: "a large gawky grey fluffy duckling with big feet and a gentle sweet face, looking different from the other ducklings" },
    { key: "mother duck", desc: "a kind plump white mother duck with soft feathers and gentle warm eyes" },
  ],
  "t13-thumbelina": [
    { key: "field mouse", desc: "a kind plump brown field mouse in a little knitted shawl and round spectacles, cozy and motherly" },
    { key: "swallow", desc: "a graceful blue-and-white swallow with a friendly face and swift elegant wings" },
  ],
  "t11-little-red-riding-hood": [
    { key: "the wolf", desc: "a sly grey wolf with a long snout, pointed ears, a bushy tail and a cunning toothy grin" },
    { key: "grandmother", desc: "a sweet elderly grandmother with silver hair, round spectacles, a shawl and a warm gentle smile" },
    { key: "woodsman", desc: "a strong friendly woodsman in a plaid shirt with an axe over his shoulder and a hearty kind bearded face" },
  ],
  "t6-little-women": [
    { key: "marmee", desc: "Marmee, a warm gentle mother in a modest 1860s dress with kind eyes and hair in a soft bun" },
    { key: "meg", desc: "Meg, the eldest sister, a pretty gentle young girl with brown hair in a tidy 1860s dress" },
    { key: "beth", desc: "Beth, a sweet shy gentle sister with soft brown hair, quiet and kind, in a simple 1860s dress" },
    { key: "amy", desc: "Amy, the youngest sister, a lively girl with curly blonde hair in a pretty 1860s pinafore dress" },
    { key: "laurie", desc: "Laurie, a friendly well-dressed dark-haired boy next door with a warm mischievous smile" },
  ],
  "t9-swiss-family-robinson": [
    { key: "father", desc: "a kind resourceful father with a sturdy build, warm bearded face and practical rolled-sleeve shirt" },
    { key: "mother", desc: "a warm capable mother with hair tied back, a long simple dress and an apron, gentle and strong" },
  ],
  "t15-rebecca-of-sunnybrook-farm": [
    { key: "aunt miranda", desc: "Aunt Miranda, a stern proper older woman with a severe face, grey hair in a tight bun and a dark high-collared dress" },
    { key: "aunt jane", desc: "Aunt Jane, a gentle soft-hearted older woman with a kind face, neat greying hair and a modest dress" },
    { key: "mr cobb", desc: "Mr Cobb, a jolly older stagecoach driver with a round friendly face, a wide-brimmed hat and a warm chuckle" },
  ],
  "t18-aesops-fables": [
    { key: "tortoise", desc: "a calm slow friendly tortoise with a patterned green-brown shell and a gentle wise face" },
    { key: "hare", desc: "a boastful speedy brown hare with long ears and a cocky grin" },
    { key: "lion", desc: "a majestic gentle golden lion with a full mane and warm noble eyes" },
    { key: "mouse", desc: "a tiny brave little brown mouse with big ears and a kind hopeful face" },
    { key: "fox", desc: "a sly clever orange-red fox with a bushy white-tipped tail and a cunning grin" },
    { key: "crow", desc: "a glossy black crow with a proud tilt of the head" },
    { key: "ant", desc: "a small hardworking red ant carrying a grain, busy and earnest" },
    { key: "grasshopper", desc: "a cheerful green grasshopper holding a tiny fiddle, carefree and merry" },
  ],
  "t4-the-secret-garden": [
    { key: "robin", desc: "a plump friendly little robin redbreast with a bright orange-red chest and cheerful black eyes" },
    { key: "dickon", desc: "Dickon, a cheerful freckled moor boy with tousled sandy hair and rosy cheeks in simple country clothes, who charms animals" },
    { key: "colin", desc: "Colin, a delicate boy with dark hair, pale and frail at first in a nightshirt, later rosy and healthy" },
    { key: "martha", desc: "Martha, a kind rosy-cheeked young housemaid with a friendly Yorkshire smile, in a maid's apron and white cap" },
  ],
  "t5-the-velveteen-rabbit": [
    { key: "velveteen rabbit", desc: "a soft plush velveteen toy rabbit with spotted brown-and-white fur, floppy ears and a stitched gentle smile" },
    { key: "rocking horse", desc: "an old worn wooden rocking horse toy with a kind painted face and a flowing grey mane" },
    { key: "nursery fairy", desc: "a gentle luminous nursery fairy with delicate translucent wings and a soft glowing kind face" },
  ],
  "t19-the-happy-prince": [
    { key: "happy prince", desc: "a tall golden prince statue on a stone pedestal, gleaming with gold leaf and jewels, a sword at his side and a kind gentle face" },
    { key: "swallow", desc: "a small graceful blue swallow with a friendly face and swift elegant wings" },
  ],
  "t2-the-starlight-lantern": [
    { key: "little cloud", desc: "a small soft round grey rain cloud with a shy gentle little face, sometimes teary, sometimes smiling" },
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
