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

import dotenv from "dotenv";
dotenv.config();

import { geminiProvider } from "../providers/GeminiProvider.js";
import { storageService } from "../services/StorageService.js";
import { getStyle } from "../config/styles.js";
import { IllustrationStyle } from "../../src/types.js";

// This script only ever generates the default (vintage-watercolor) style, written to the
// legacy flat path casts/<storyId>/<key>.* — the same path StoryLibraryService treats as that
// style's home. Other styles are generated on demand per story via the "generate cast in this
// style" action in the Story Library UI, which writes to casts/<storyId>/<styleId>/<key>.*.
const HOUSE_STYLE = getStyle().promptFragment;
import fs from "fs";
import path from "path";

const casts: Record<string, { key: string; desc: string }[]> = {
  "t8-a-little-princess": [
    { key: "miss minchin", desc: "Miss Minchin, a tall stern boarding-school headmistress with a sharp face, tight grey hair in a bun and a dark severe high-collared dress" },
    { key: "becky", desc: "Becky, a small kind young scullery maid with a smudged apron, messy hair, rosy cheeks and a warm shy smile" },
    { key: "ram dass", desc: "Ram Dass, a gentle kind Indian manservant with warm eyes, wearing a colourful turban and a flowing robe" },
    { key: "mr carrisford", desc: "Mr Carrisford, a thin frail kind gentleman with a gaunt gentle face, wrapped in blankets in an armchair, known as \"the Indian Gentleman\", warm-hearted despite his illness" },
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
    { key: "jimmy bean", desc: "Jimmy Bean, a cheerful freckled orphan boy with tousled hair and neatly patched clothes, hopeful and eager for a family" },
  ],
  "t7-treasure-island": [
    { key: "billy bones", desc: "Billy Bones, a weathered old sea captain with a scarred face, a faded blue coat, a black tricorn hat and a battered sea chest" },
    { key: "captain smollett", desc: "Captain Smollett, a stern upright ship's captain in a smart navy coat and hat, holding a brass spyglass" },
    { key: "long john silver", desc: "Long John Silver, a charming one-legged sea cook with a wooden crutch, a colourful parrot on his shoulder and a sly friendly grin" },
    { key: "ben gunn", desc: "Ben Gunn, a ragged wild-haired marooned sailor in tattered goat-skin clothes with a kind wide-eyed weathered face" },
    { key: "dr livesey", desc: "Dr Livesey, a calm intelligent ship's doctor with a kind clever face, neat proper clothes, and a steady reassuring manner" },
  ],
  "t14-robinson-crusoe": [
    { key: "robinson crusoe", desc: "Robinson Crusoe, a young man in his early twenties, shipwrecked castaway, windswept sun-bleached hair, weathered tanned skin, wearing simple ragged sailor's clothes, a lean rugged build, eager bright eyes full of wonder, a hopeful adventurous expression" },
    { key: "friday", desc: "Friday, a kind brave young island companion with warm brown skin, a friendly smile and simple woven island clothes" },
    { key: "parrot", desc: "a bright colourful tropical parrot with red, blue and yellow feathers" },
  ],
  "t13-thumbelina": [
    { key: "field mouse", desc: "a kind plump brown field mouse in a little knitted shawl and round spectacles, cozy and motherly" },
    { key: "swallow", desc: "a graceful blue-and-white swallow with a friendly face and swift elegant wings" },
    { key: "toad", desc: "The Toad, a large warty green toad with big round golden eyes and webbed feet, sitting on a lily pad, unpleasant but not evil, croaking excitedly" },
    { key: "mole", desc: "The Mole, a plump velvety grey mole with tiny eyes, round spectacles, wearing a fine velvet waistcoat, dignified and a little pompous" },
    { key: "beetle", desc: "The Cockchafer Beetle, a shiny brown beetle with long curling antennae and glossy patterned wing cases, fluttering and fickle" },
    { key: "flower prince", desc: "The Flower Prince, a tiny handsome prince no bigger than Thumbelina, with delicate translucent wings, a golden crown and flower-petal robes, kind and gentle" },
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
    { key: "mr laurence", desc: "Mr Laurence, Laurie's grandfather, a distinguished elderly gentleman with white hair, a kind stern face that softens to warmth, and fine old-fashioned clothes" },
  ],
  "t9-swiss-family-robinson": [
    { key: "father", desc: "Pastor Robinson, the father, a kind resourceful man with a sturdy build, warm bearded face and practical rolled-sleeve shirt, wise and guided equally by science and faith" },
    { key: "mother", desc: "Elizabeth, the mother, a warm capable woman with hair tied back, a long simple dress and an apron, resourceful and brave, gentle and strong" },
    { key: "fritz", desc: "Fritz, the eldest son, a tall athletic teenage boy of fifteen with tousled brown hair, confident bright eyes and a bold adventurous grin, wearing a practical rolled-sleeve shirt, strong and quick to act" },
    { key: "ernst", desc: "Ernst, the second son, a thoughtful studious boy of fourteen with neat brown hair and gentle curious eyes, often pausing to examine a leaf or a shell, quieter and more bookish than his brothers" },
    { key: "jack", desc: "Jack, the third son, a small energetic boy of ten with a mischievous grin, tousled hair and bright quick eyes, always first to dash toward the next adventure" },
    { key: "francis", desc: "Francis, the youngest son, a sweet small six-year-old boy with round rosy cheeks, big curious eyes and a gentle eager smile, always looking up to his older brothers" },
  ],
  "t15-rebecca-of-sunnybrook-farm": [
    { key: "aunt miranda", desc: "Aunt Miranda, a stern proper older woman with a severe face, grey hair in a tight bun and a dark high-collared dress" },
    { key: "aunt jane", desc: "Aunt Jane, a gentle soft-hearted older woman with a kind face, neat greying hair and a modest dress" },
    { key: "mr cobb", desc: "Mr Cobb, a jolly older stagecoach driver with a round friendly face, a wide-brimmed hat and a warm chuckle" },
    { key: "emma jane", desc: "Emma Jane Perkins, Rebecca's cheerful plump best friend, with rosy cheeks, neat braided hair and a sweet loyal smile" },
  ],
  "t4-the-secret-garden": [
    { key: "robin", desc: "a plump friendly little robin redbreast with a bright orange-red chest and cheerful black eyes" },
    { key: "dickon", desc: "Dickon, a cheerful freckled moor boy with tousled sandy hair and rosy cheeks in simple country clothes, who charms animals" },
    { key: "colin", desc: "Colin, a delicate boy with dark hair, pale and frail at first in a nightshirt, later rosy and healthy" },
    { key: "martha", desc: "Martha, a kind rosy-cheeked young housemaid with a friendly Yorkshire smile, in a maid's apron and white cap" },
    { key: "ben weatherstaff", desc: "Ben Weatherstaff, a gruff old gardener with a weathered wrinkled face, a bushy grey moustache, a flat cap and rough work clothes, secretly kind-hearted" },
  ],
  "t5-the-velveteen-rabbit": [
    { key: "boy", desc: "The Boy, a warm affectionate young child with tousled hair and rosy cheeks, wearing cozy nursery pyjamas, a gentle loving expression, always holding or reaching for his beloved toy rabbit" },
    { key: "velveteen rabbit", desc: "a soft plush velveteen toy rabbit with spotted brown-and-white fur, floppy ears and a stitched gentle smile" },
    { key: "rocking horse", desc: "an old worn wooden rocking horse toy with a kind painted face and a flowing grey mane" },
    { key: "nursery fairy", desc: "a gentle luminous nursery fairy with delicate translucent wings and a soft glowing kind face" },
  ],
  "t19-the-happy-prince": [
    { key: "happy prince", desc: "a tall golden prince statue on a stone pedestal, gleaming with gold leaf and jewels, a sword at his side and a kind gentle face" },
    { key: "swallow", desc: "a small graceful blue swallow with a friendly face and swift elegant wings" },
    { key: "little match girl", desc: "The Little Match Girl, a poor thin barefoot girl in a ragged shawl, holding a small bundle of matches, cold but with hopeful eyes" },
  ],
  "t3-jack-and-the-beanstalk": [
    { key: "jack", desc: "Jack, a cheerful young boy of about five with tousled brown hair and rosy cheeks, wearing a patched green tunic, brown trousers and simple boots, bright-eyed, curious and brave" },
    { key: "mother", desc: "Jack's Mother, a kind hard-working woman in a simple grey dress and white apron with her hair tied back in a headscarf, gentle and loving with tired but warm eyes" },
    { key: "the giant", desc: "The Giant, an enormous round-bellied giant with a big bushy red beard, a rumpled brown tunic and heavy boots, comically huge and grumpy in a silly storybook way rather than frightening" },
    { key: "milky white", desc: "Milky-White, a gentle white dairy cow with soft brown eyes, long lashes and a little brass bell on a red collar, thin but sweet-natured and calm" },
    { key: "old man", desc: "The Old Man, a small twinkly-eyed old trader with a long white beard and a patched purple cloak, holding a little pouch of softly glowing magic beans, mysterious but kind" },
    { key: "golden hen", desc: "The Golden Hen, a plump proud hen with shimmering golden feathers that glow like sunlight, sitting on a small nest of gleaming golden eggs" },
    { key: "magic harp", desc: "The Magic Harp, a small enchanted golden harp with a gentle carved face on its curved frame and softly glowing strings, able to sing sweetly all on its own" },
  ],
  "t21-the-kindness-compass": [
    { key: "the compass", desc: "The Kindness Compass, a small round antique brass compass with a warm golden case, a delicate glass face and a slender needle that glows faintly, its dial engraved with tiny swirling leaf patterns instead of the usual letters" },
    { key: "mr higgins", desc: "Mr Higgins, a friendly elderly neighbour with round wire spectacles, a neat grey moustache, a soft flat cap and a knitted cardigan, kind-faced and a little stooped" },
    { key: "theo", desc: "Theo, a shy young boy of about six with short curly dark hair, warm brown skin, a striped t-shirt and scuffed sneakers, quiet and thoughtful with a hopeful smile" },
  ],
  "t22-the-mistake-museum": [
    { key: "curator", desc: "The Curator, a warm round owl-like museum keeper with gentle kind eyes, round wire-rimmed spectacles, a soft rumpled coat covered in colourful patches and small tufts of feathery hair, welcoming and a little rumpled" },
  ],
  "t23-the-sharing-sandwich": [
    { key: "mia", desc: "Mia, a cheerful young girl of about four with bouncy pigtails, freckles, a bright yellow dungaree dress and a wide happy grin" },
    { key: "biscuit", desc: "Biscuit, a scruffy little sandy-brown terrier dog with floppy ears, a stubby wagging tail and a permanently hopeful expression" },
    { key: "mrs petunia", desc: "Mrs Petunia, a plump cheerful elderly neighbour with silver curls, round rosy cheeks, a flowery apron and small round glasses" },
  ],
  "t24-the-new-kid-bench": [
    { key: "the bench", desc: "The Waiting Bench, an old weathered wooden playground bench with peeling green paint, worn smooth armrests and a few carved initials, standing under a crooked oak" },
    { key: "ivy", desc: "Ivy, a shy new girl of about seven with dark brown braids, warm brown skin, a red cardigan and a well-worn lunchbox held tightly in both hands" },
  ],
  "t25-the-listening-ears": [
    { key: "the listening ears", desc: "The Listening Ears, a pair of soft oversized velvety earmuffs in warm cream and gold with a gentle magical glow around the rims and a slender padded headband" },
    { key: "noor", desc: "Noor, a thoughtful girl of about eight with a dark bob of hair, big attentive eyes, a green pinafore dress and a small quiet smile" },
  ],
  "t26-the-word-that-flew-away": [
    { key: "the paper bird", desc: "The Paper Bird, a small folded origami bird with sharp creased grey wings and a slightly crumpled beak, later turning soft luminous white" },
    { key: "jonah", desc: "Jonah, a gentle boy of about seven with round cheeks, curly light brown hair, a blue striped jumper and expressive easily-hurt eyes" },
  ],
  "t27-the-tiny-lie": [
    { key: "the fib", desc: "The Fib, a round fuzzy grey creature covered in soft shaggy fur with two big round yellow eyes, no visible mouth, stubby little legs and a sheepish guilty expression" },
  ],
  "t28-the-brave-little-ladder": [
    { key: "the ladder", desc: "The Brave Little Ladder, a friendly old wooden garden ladder with worn rounded rungs and a warm honey-coloured grain, one rung softly glowing gold while the rest fade into mist" },
  ],
  "t29-standing-tall": [
    { key: "rosa", desc: "Rosa, a quiet imaginative girl of about eight with black curly hair in two puffs, warm brown skin, ink-smudged fingers and a sketchbook of dragons always nearby" },
    { key: "kai", desc: "Kai, a lanky boy of about nine with short spiky sandy hair, freckles and a smirking expression that softens into sheepish regret" },
  ],
  "t30-the-truth-lantern": [
    { key: "the lantern", desc: "The Truth Lantern, an ornate antique brass hall lantern with four bevelled glass panes, a curled hanging hook and delicate scrollwork, dark and cold until it blazes warm gold" },
  ],
  "t31-the-impossible-kite": [
    { key: "the kite", desc: "The Impossible Kite, a homemade diamond kite of cream paper stretched over two thin wooden sticks, with a long ribbon tail and several visible patches and mends" },
  ],
  "t32-the-word-yet": [
    { key: "grumble", desc: "Grumble, a small round grumpy green dragon the size of a large dog, with stubby useless wings, a soot-smudged snout, short curved horns and a permanently unimpressed expression" },
  ],
  "t33-the-seed-that-wanted-waiting": [
    { key: "the seed", desc: "The Silver Seed, a single smooth teardrop-shaped seed of shimmering silver with a faint golden glow and tiny spiral markings on its shell" },
    { key: "nutmeg", desc: "Nutmeg, a cheeky red squirrel with a huge bushy tail, bright black eyes, tufted ears and a permanently greedy hopeful expression" },
  ],
  "t34-the-big-sibling-badge": [
    { key: "the badge", desc: "The Big Sibling Badge, a small round brass badge with the words BIG SIBLING embossed around the rim, a simple pin back and a soft golden inner glow" },
  ],
  "t35-the-memory-quilt": [
    { key: "grandma", desc: "Grandma, a warm silver-haired grandmother with soft wrinkles, round spectacles, a lavender cardigan and gentle hands that are always busy with something" },
    { key: "the quilt", desc: "The Memory Quilt, a large hand-stitched patchwork quilt of many mismatched squares in faded blue, yellow cotton, green velvet, grey wool and pale flannel, softly glowing at the seams" },
  ],
  "t36-the-borrowed-wings": [
    { key: "the wings", desc: "The Borrowed Wings, a magnificent pair of handmade costume wings built from bent wire, cream silk and hundreds of layered paper feathers, delicate and slightly translucent" },
    { key: "hana", desc: "Hana, a kind careful girl of about eight with straight black hair cut to her chin, a thoughtful steady gaze and a simple stage costume" },
  ],
  "t37-the-four-coin-kingdoms": [
    { key: "save", desc: "Save, a tiny coin-sized figure in a neat slate-blue coat with a small brass key on a chain around her neck, tidy, patient and watchful" },
    { key: "spend", desc: "Spend, a tiny coin-sized ruler in a bright crooked paper crown and a rumpled scarlet cloak, arms flung wide, joyful and impulsive" },
    { key: "give", desc: "Give, a tiny coin-sized figure in a simple soft green robe with open empty hands and a serene generous smile, glowing faintly warm" },
    { key: "grow", desc: "Grow, the smallest tiny coin-sized figure, in a muddy gardening apron with a miniature watering can and a mysterious knowing half-smile" },
  ],
  "t38-the-weather-inside": [
    { key: "the little storm", desc: "The Little Storm, a small dark grey rain cloud about the size of a dinner plate with a scowling expressive face, tiny crackles of lightning at its edges and a fine curtain of rain beneath it" },
  ],
  "t39-the-copycat-cloud": [
    { key: "the copycat cloud", desc: "The Copycat Cloud, a small fluffy white cloud with a simple cheerful face and wispy stretchy little arms, always caught mid-imitation of somebody else's pose" },
  ],
  "t40-the-forgiveness-bridge": [
    { key: "the bridge", desc: "The Forgiveness Bridge, a small handmade wooden plank footbridge over a clear stream, with rope handrails and twenty planks, some worn pale and smooth in the middle" },
    { key: "wren", desc: "Wren, a lively girl of about eight with short reddish hair, a scattering of freckles, a mustard-yellow jumper and expressive apologetic eyes" },
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
