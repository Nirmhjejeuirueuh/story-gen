/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Seeds hero-slot Story Library entries from authored content below.
 * Each story becomes server/stories/<id>/chapters/<n>.md in the labeled format:
 *   Story: <narrative, MAIN_CHARACTER = the uploaded child hero>
 *   Illustration: <image prompt, same hero token>
 *   Charators:            (empty — no fixed cast; hero comes from the uploaded character)
 *
 * Public-domain classics, freely adapted into short hero-slot storybooks. Re-runnable:
 * existing chapter files for a listed story are overwritten. Run:
 *   node server/scripts/seed-stories.mjs
 */

import fs from "fs";
import path from "path";

const STYLE = "whimsical watercolor storybook illustration, soft pastel palette, gentle warm light, delicate ink linework, vintage children's book style";

const stories = [
  {
    id: "t4-the-secret-garden",
    tags: ["Classic", "Nature", "Friendship"],
    pages: [
      {
        story: "MAIN_CHARACTER had always been rather lonely, and now, with no one else to care for them, MAIN_CHARACTER was sent far across the country to live with a distant uncle. The train rattled on and on, toward the wild green moors of the north.",
        illustration: `MAIN_CHARACTER as a small child sitting alone by a train window, a little suitcase on the seat, rolling green misty moors passing outside, soft and wistful mood, ${STYLE}`,
      },
      {
        story: "At last MAIN_CHARACTER arrived at Misselthwaite Manor, an enormous old stone house with a hundred rooms. It was grand and grey and very, very quiet, and the wind moaned softly around its chimneys.",
        illustration: `MAIN_CHARACTER standing small before a huge grey stone manor house at dusk, ivy climbing the walls, wild moors stretching behind, tall arched windows glowing faintly, ${STYLE}`,
      },
      {
        story: "A kind young maid named Martha brought MAIN_CHARACTER warm porridge and cheerful chatter. 'There's a hundred locked rooms here,' she whispered, 'and one secret garden that's been shut up tight for ten whole years.'",
        illustration: `MAIN_CHARACTER at a big wooden breakfast table in a cozy old kitchen, a friendly rosy-cheeked maid pouring tea and talking warmly, morning light through leaded windows, ${STYLE}`,
      },
      {
        story: "Longing for fresh air, MAIN_CHARACTER wandered out across the windy gardens. There, hopping along an old brick wall, was a plump little robin with a bright red breast, tilting its head as if to say hello.",
        illustration: `MAIN_CHARACTER outdoors in a walled winter garden reaching gently toward a friendly red-breasted robin perched on an old ivy-covered brick wall, bare rose bushes around, crisp fresh air, ${STYLE}`,
      },
      {
        story: "The robin chirped and scratched at the loose earth beneath the ivy. When MAIN_CHARACTER knelt down to look, something glinted in the soil — an old iron key, cold and rusty and waiting.",
        illustration: `MAIN_CHARACTER kneeling in dark garden soil, brushing away leaves to reveal an old rusty iron key, the little robin watching close by, ivy trailing overhead, discovery and wonder, ${STYLE}`,
      },
      {
        story: "MAIN_CHARACTER searched along the tangled wall until a gust of wind lifted the ivy aside. Hidden underneath was a small wooden door, and the rusty key slid into its lock with a satisfying click.",
        illustration: `MAIN_CHARACTER pulling back a curtain of thick green ivy to reveal a hidden wooden door in a brick wall, fitting an old key into the keyhole, sunlight breaking through, breathless anticipation, ${STYLE}`,
      },
      {
        story: "The door creaked open, and MAIN_CHARACTER stepped inside the secret garden. It was silent and sleeping — grey climbing roses tangled everywhere, and everything looked brown and bare, as if waiting for someone at last.",
        illustration: `MAIN_CHARACTER standing at an open door inside a large overgrown secret garden, tangled leafless rose vines climbing everywhere, quiet and mysterious, dappled pale light, sense of a hidden world, ${STYLE}`,
      },
      {
        story: "'I'll wake you up,' MAIN_CHARACTER promised the sleeping garden. Kneeling by the roots, MAIN_CHARACTER found tiny green shoots pushing bravely up through the soil — the garden was not dead after all.",
        illustration: `MAIN_CHARACTER kneeling and gently parting brown grass to reveal tiny bright green shoots poking up from the earth, hopeful and tender, soft morning light in the secret garden, ${STYLE}`,
      },
      {
        story: "One morning MAIN_CHARACTER met Dickon, a moor boy who could charm any wild creature. A fox trotted at his heels and a glossy crow rode his shoulder, and he grinned like the sunshine itself.",
        illustration: `MAIN_CHARACTER meeting a cheerful freckled moor boy in the garden, a tame red fox at his feet and a black crow on his shoulder, friendly and magical, blossoming greenery beginning around them, ${STYLE}`,
      },
      {
        story: "Together MAIN_CHARACTER and Dickon dug and planted and pulled away the choking weeds. Every day the secret garden grew a little greener, and their laughter rang out where there had been only silence.",
        illustration: `MAIN_CHARACTER and the moor boy planting seeds and clearing weeds together in the secret garden, sleeves rolled up, small green plants sprouting, fox and robin nearby, joyful teamwork, ${STYLE}`,
      },
      {
        story: "That night, MAIN_CHARACTER woke to a strange sound echoing down the long dark corridors — someone, somewhere in the great house, was crying. Curious and brave, MAIN_CHARACTER took a candle and followed the sound.",
        illustration: `MAIN_CHARACTER in a nightgown holding a flickering candle in a long shadowy manor corridor at night, listening toward a distant door, portraits on the walls, mysterious and hushed, ${STYLE}`,
      },
      {
        story: "Behind a hidden door lay a boy named Colin, MAIN_CHARACTER's cousin, pale and cross in a great carved bed. 'I'm too ill to ever walk,' he said sadly. 'I shall never see anything at all.'",
        illustration: `MAIN_CHARACTER discovering a pale thin boy propped up in an enormous carved four-poster bed in a dim grand room, candlelight, MAIN_CHARACTER looking kind and surprised, tender and quiet, ${STYLE}`,
      },
      {
        story: "But MAIN_CHARACTER leaned close and whispered a wonderful secret — a hidden garden, coming alive again. Colin's tired eyes grew wide and bright, and for the first time in years, he smiled.",
        illustration: `MAIN_CHARACTER sitting on the edge of the big bed whispering excitedly to the pale boy, whose face lights up with wonder and a first smile, warm candlelight, a spark of hope, ${STYLE}`,
      },
      {
        story: "So the children hatched a plan. Very carefully, MAIN_CHARACTER and Dickon wheeled Colin out through the garden door — and into the secret garden for the very first time in his whole life.",
        illustration: `MAIN_CHARACTER and the moor boy gently pushing a boy in an old wooden wheelchair through an ivy-framed garden door into a lush green garden, excitement and care, spring blossoms everywhere, ${STYLE}`,
      },
      {
        story: "Spring had burst open all at once. Blossoms tumbled over the walls, birds sang, and the whole secret garden glowed green and gold. Colin breathed the sweet air as if he had never truly breathed before.",
        illustration: `A lush secret garden in full spring bloom with cascading pink and white blossoms and singing birds, MAIN_CHARACTER and friends around the boy in the wheelchair gazing up in awe, radiant sunlight, ${STYLE}`,
      },
      {
        story: "Day by day, with fresh air and friendship, Colin grew stronger. Then one golden afternoon, holding tight to MAIN_CHARACTER's hand, he pushed himself up — and stood, wobbling, upon his own two feet.",
        illustration: `A once-frail boy standing shakily for the first time, gripping MAIN_CHARACTER's hand for support, both faces full of triumph and joy, blooming roses all around the sunny garden, ${STYLE}`,
      },
      {
        story: "'Look at me — I can walk!' Colin laughed, and the children ran together across the grass. The secret garden rang with joy, and every rose seemed to bloom brighter just for them.",
        illustration: `MAIN_CHARACTER and two other children running and laughing joyfully across a grassy secret garden bursting with colourful roses, fox leaping alongside, birds overhead, pure happiness, ${STYLE}`,
      },
      {
        story: "When the astonished household saw Colin walking and rosy and well, they wept for happiness. MAIN_CHARACTER had found a family, a friend, and a home — and the garden was a secret no longer, but a place full of life.",
        illustration: `MAIN_CHARACTER surrounded by a happy gathering of family and household staff in the blooming secret garden, everyone smiling and celebrating, the healthy boy standing proud, warm golden sunset light, ${STYLE}`,
      },
    ],
  },

  {
    id: "t5-the-velveteen-rabbit",
    tags: ["Classic", "Friendship", "Heartwarming"],
    pages: [
      { story: "On a bright morning, MAIN_CHARACTER unwrapped a soft velveteen rabbit — the loveliest present of all, with silky ears, a stitched smile, and a coat of spotted brown and white.", illustration: `MAIN_CHARACTER as a small child on a cozy nursery floor unwrapping a soft brown-and-white velveteen toy rabbit from tissue paper on a bright morning, delighted expression, ${STYLE}` },
      { story: "The other fancy toys in the nursery bragged about their springs and shiny gears, but MAIN_CHARACTER only wanted the gentle little rabbit.", illustration: `A nursery shelf of proud mechanical toys and a tin soldier, while MAIN_CHARACTER hugs the plain velveteen rabbit close, warm and tender, soft lamplight, ${STYLE}` },
      { story: "Every night MAIN_CHARACTER tucked the rabbit close under the blankets, whispering secrets and dreams into its soft, listening ears.", illustration: `MAIN_CHARACTER snuggled in bed at night whispering to the velveteen rabbit tucked under a patchwork quilt, moon and stars through the window, peaceful, ${STYLE}` },
      { story: "A wise old rocking horse told the rabbit a wonderful thing: 'When a child loves you truly, you stop being a toy and become Real.'", illustration: `An old worn wooden rocking horse speaking kindly to the velveteen rabbit in the nursery, MAIN_CHARACTER asleep nearby, gentle magical mood, ${STYLE}` },
      { story: "MAIN_CHARACTER and the rabbit went everywhere together — picnics on the grass, forts of pillows, and grand adventures all through the garden.", illustration: `MAIN_CHARACTER playing joyfully in a sunny garden with the velveteen rabbit, a picnic blanket and pillow fort, butterflies, carefree summer day, ${STYLE}` },
      { story: "Through sun and rain the rabbit grew shabby and worn, its whiskers loved away — but to MAIN_CHARACTER it was more beautiful than ever.", illustration: `A well-worn velveteen rabbit with a patched ear held lovingly by MAIN_CHARACTER, both a little muddy from play, warm affectionate mood, ${STYLE}` },
      { story: "One warm evening in the meadow, two real wild rabbits hopped near, curious. 'Can you hop? Are you real?' they asked the little velveteen rabbit.", illustration: `The velveteen rabbit sitting in tall meadow ferns at dusk while two soft wild rabbits sniff at it curiously, MAIN_CHARACTER watching from nearby, ${STYLE}` },
      { story: "The velveteen rabbit wished, more than anything in the world, that it could be Real too — and MAIN_CHARACTER hugged it and said it already was.", illustration: `MAIN_CHARACTER cradling the velveteen rabbit under a golden sunset sky in a meadow, wistful and loving, wildflowers around, ${STYLE}` },
      { story: "Then MAIN_CHARACTER fell ill with a fever, and the faithful little rabbit stayed close through every long and worried night.", illustration: `MAIN_CHARACTER lying in bed with a fever, the velveteen rabbit tucked beside them on the pillow keeping watch, soft candlelight, caring mood, ${STYLE}` },
      { story: "When MAIN_CHARACTER grew well again, everyone cheered — but the old toy rabbit was carried out to the garden to be thrown away.", illustration: `The shabby velveteen rabbit left alone on the grass in a corner of the garden, autumn leaves around, a little forlorn, soft grey light, ${STYLE}` },
      { story: "Alone among the flowers, the rabbit felt a small tear roll down its cheek — and where the tear fell, a bright flower bloomed.", illustration: `A single glistening tear falling from the velveteen rabbit onto the soil, a magical flower blooming where it lands, gentle sparkle, ${STYLE}` },
      { story: "From the flower stepped the gentle Nursery Fairy. 'You were made Real by the one who loved you,' she smiled, 'and now I will make you Real to everyone.'", illustration: `A luminous kind nursery fairy with delicate wings emerging from a glowing flower before the velveteen rabbit, soft magical light in a moonlit garden, ${STYLE}` },
      { story: "She kissed the rabbit, and all at once it could twitch its nose and kick its legs — a living, breathing bunny at last, soft and warm and free.", illustration: `The velveteen rabbit transforming into a real living bunny mid-hop, sparkles swirling around, joyful and magical, moonlit garden, ${STYLE}` },
      { story: "In spring, MAIN_CHARACTER spotted a bright-eyed rabbit at the edge of the garden and somehow knew, deep down, that love had made a dear friend Real forever.", illustration: `MAIN_CHARACTER kneeling in a blooming spring garden smiling at a real brown-and-white rabbit that looks back knowingly, tender reunion, warm sunlight, ${STYLE}` },
    ],
  },

  {
    id: "t10-the-jungle-book",
    tags: ["Adventure", "Animals", "Classic"],
    // Fixed cast (keys → charators/<key>.png, generated by generate-casts.mjs in HOUSE_STYLE).
    // pageCharacters lists which of them appear on each page 1..16, so their reference images
    // are passed into that page's generation and they stay visually identical throughout.
    pageCharacters: [
      ["mother wolf"],            // 1
      ["mother wolf"],            // 2
      ["mother wolf"],            // 3
      ["baloo"],                  // 4
      ["bagheera"],               // 5
      ["shere khan"],             // 6
      [],                         // 7 (monkeys)
      ["baloo", "bagheera"],      // 8
      ["baloo", "bagheera"],      // 9
      ["shere khan"],             // 10
      [],                         // 11
      ["shere khan"],             // 12
      ["shere khan"],             // 13
      ["baloo", "bagheera"],      // 14
      [],                         // 15
      ["baloo", "bagheera"],      // 16
    ],
    pages: [
      { story: "Deep in the Indian jungle, a tiny child named MAIN_CHARACTER wandered lost among the giant ferns — until a family of kind grey wolves found them.", illustration: `A small lost child, MAIN_CHARACTER, among towering jungle ferns at twilight as a family of gentle grey wolves approaches curiously, lush green jungle, ${STYLE}` },
      { story: "Mother Wolf cradled MAIN_CHARACTER among her fuzzy cubs, and the whole pack agreed to raise the little 'man-cub' as one of their own.", illustration: `MAIN_CHARACTER nestled warmly among wolf cubs beside a protective mother wolf in a rocky den, soft firelight glow, tender and safe, ${STYLE}` },
      { story: "MAIN_CHARACTER grew strong and quick, learning to run and howl with the pack beneath the great silver jungle moon.", illustration: `MAIN_CHARACTER as a happy jungle child running alongside a wolf pack across moonlit jungle rocks, joyful motion, starry night sky, ${STYLE}` },
      { story: "Baloo, the big sleepy brown bear, taught MAIN_CHARACTER the Law of the Jungle and the friendly words to speak with every animal.", illustration: `A large jolly brown bear teaching MAIN_CHARACTER by a jungle river, the child laughing, dragonflies and lush foliage, warm and playful, ${STYLE}` },
      { story: "Bagheera, the wise black panther, taught MAIN_CHARACTER to climb high, to leap far, and to move as silently as a shadow.", illustration: `A sleek black panther guiding MAIN_CHARACTER as they climb a mossy jungle tree together, dappled sunlight through the canopy, graceful, ${STYLE}` },
      { story: "But Shere Khan the tiger prowled the shadows, growling that the little man-cub did not belong in his jungle.", illustration: `A large fierce orange tiger prowling through dark jungle undergrowth, glowing eyes, MAIN_CHARACTER watching warily from behind a tree, tense mood, ${STYLE}` },
      { story: "One day a band of cheeky monkeys snatched MAIN_CHARACTER away, swinging off through the trees to their crumbling jungle city.", illustration: `Playful monkeys carrying MAIN_CHARACTER through the treetops toward ancient ruined stone temples wrapped in vines, dynamic and adventurous, ${STYLE}` },
      { story: "Baloo and Bagheera raced to the rescue, and Kaa the great python helped free MAIN_CHARACTER from the mischievous monkeys.", illustration: `MAIN_CHARACTER being rescued among ancient ruins as the bear, panther, and a huge friendly python scatter the monkeys, exciting action, moonlight, ${STYLE}` },
      { story: "MAIN_CHARACTER learned that the jungle held danger as well as friendship, and grew braver and wiser with every passing season.", illustration: `MAIN_CHARACTER sitting thoughtfully on a jungle rock at sunset with the bear and panther beside them, warm reflective mood, golden light, ${STYLE}` },
      { story: "When Shere Khan returned, hungry and fierce, the whole pack looked to brave MAIN_CHARACTER to protect their jungle home.", illustration: `MAIN_CHARACTER standing protectively before the wolf pack as the tiger looms in the darkness beyond, courageous stance, dramatic jungle night, ${STYLE}` },
      { story: "Remembering old tales, MAIN_CHARACTER bravely fetched the one thing the tiger feared most — the Red Flower, which is fire.", illustration: `MAIN_CHARACTER carefully carrying a glowing torch of fire (the 'Red Flower') through the dark jungle, warm light on a determined face, ${STYLE}` },
      { story: "Holding the glowing branch high, MAIN_CHARACTER stood tall and unafraid before the snarling, circling tiger.", illustration: `MAIN_CHARACTER holding a bright flaming torch high and standing bravely before the snarling tiger, firelight pushing back the shadows, ${STYLE}` },
      { story: "Shere Khan roared and swiped, but the flame drove him back, and he fled deep into the jungle, never to trouble the pack again.", illustration: `The orange tiger leaping away in retreat into deep jungle darkness while MAIN_CHARACTER stands victorious with the torch, wolves cheering, ${STYLE}` },
      { story: "The animals rejoiced, for MAIN_CHARACTER had saved the family that had raised them with such love.", illustration: `MAIN_CHARACTER surrounded by celebrating wolves, the bear, and the panther in a moonlit jungle clearing, joyful reunion, fireflies glowing, ${STYLE}` },
      { story: "Yet MAIN_CHARACTER began to wonder about the world of people beyond the trees, where warm lantern lights glowed in the distance.", illustration: `MAIN_CHARACTER gazing from the jungle's edge toward a distant village of glowing lantern lights at dusk, curious and dreamy, wistful mood, ${STYLE}` },
      { story: "With a grateful heart, MAIN_CHARACTER hugged Baloo and Bagheera goodbye, ready and brave for whatever new adventure might come next.", illustration: `MAIN_CHARACTER warmly hugging the big brown bear and black panther farewell at the jungle's edge at sunrise, hopeful and heartfelt, golden light, ${STYLE}` },
    ],
  },

  {
    id: "t19-the-happy-prince",
    tags: ["Classic", "Kindness", "Touching"],
    pages: [
      { story: "High above the town stood a golden statue, the Happy Prince, gleaming with bright jewels — and MAIN_CHARACTER loved to gaze up at him each evening.", illustration: `MAIN_CHARACTER as a child looking up in wonder at a tall golden prince statue studded with jewels on a pedestal above a little old town at dusk, ${STYLE}` },
      { story: "One evening a little swallow, late for its long journey south, fluttered down to rest at the statue's feet beside MAIN_CHARACTER.", illustration: `A small blue swallow landing at the base of the golden statue beside MAIN_CHARACTER in the twilight town square, gentle and quiet, ${STYLE}` },
      { story: "To their surprise, the Prince was weeping. 'From up here,' he said softly, 'I can see all the sadness and need in my little town.'", illustration: `A tear rolling down the golden face of the prince statue, MAIN_CHARACTER and the swallow looking up with concern, soft moonlight, moving mood, ${STYLE}` },
      { story: "'Please help me,' said the Prince. 'Take the ruby from my sword to the poor mother whose child is ill.' MAIN_CHARACTER and the swallow agreed at once.", illustration: `The prince statue's sword-hilt glowing with a large red ruby, MAIN_CHARACTER and the swallow reaching to take it, warm determined mood, night, ${STYLE}` },
      { story: "Together they carried the shining ruby through the moonlit streets and left it gently beside a sleeping, feverish child.", illustration: `MAIN_CHARACTER and the swallow placing a glowing ruby by a sleeping child in a humble attic room, tender candlelight, quiet kindness, ${STYLE}` },
      { story: "The next night the Prince asked them to carry a bright sapphire from his eye to a cold and hungry young writer.", illustration: `MAIN_CHARACTER cupping a glowing blue sapphire with the swallow flying beside them over moonlit rooftops of the old town, ${STYLE}` },
      { story: "MAIN_CHARACTER climbed the narrow stairs and slipped the jewel onto the poor writer's desk, and he wept with sudden joy.", illustration: `MAIN_CHARACTER leaving a shining sapphire on a cluttered desk of a thin young writer in a chilly garret, the writer amazed, warm glow, ${STYLE}` },
      { story: "Night after night, MAIN_CHARACTER and the swallow gave away the Prince's shining gold, leaf by leaf, to everyone in need.", illustration: `MAIN_CHARACTER and the swallow carrying thin flakes of gold leaf down to poor townsfolk through snowy moonlit streets, generous and gentle, ${STYLE}` },
      { story: "The children of the town found coins and warm bread and mittens they could not explain, and their happy laughter returned to the streets.", illustration: `Poor but joyful children discovering coins and bread and warm mittens in a snowy lane, MAIN_CHARACTER watching kindly from a doorway, ${STYLE}` },
      { story: "But winter came, and the Prince, now dull and plain, grew cold — and the faithful little swallow grew weaker and weaker.", illustration: `The now-bare grey prince statue in falling snow, the small swallow shivering at its feet, MAIN_CHARACTER hurrying over with worry, ${STYLE}` },
      { story: "MAIN_CHARACTER wrapped the little bird up warm and close, and it whispered, 'You have a kind and golden heart.'", illustration: `MAIN_CHARACTER gently wrapping the tired little swallow in a warm woolen scarf, tender and loving, soft snow falling, moonlight, ${STYLE}` },
      { story: "Though the statue was bare now, MAIN_CHARACTER knew it was more beautiful than when it had glittered, for it had given everything away.", illustration: `MAIN_CHARACTER standing beside the plain grey statue in the snow at dawn, looking up with quiet respect and love, soft pink morning light, ${STYLE}` },
      { story: "In spring, MAIN_CHARACTER planted a bright garden at the Prince's feet, and the swallow's kin returned to sing sweetly there.", illustration: `MAIN_CHARACTER planting colourful flowers around the base of the statue in spring while swallows swoop and sing overhead, joyful and hopeful, ${STYLE}` },
      { story: "And everyone agreed the truest treasure was never the gold at all, but the kindness that MAIN_CHARACTER had carried all through the town.", illustration: `MAIN_CHARACTER surrounded by grateful happy townsfolk and children in a sunlit spring square by the statue and its new garden, heartwarming, ${STYLE}` },
    ],
  },
];

const storiesRoot = path.join(process.cwd(), "server", "stories");
let totalFiles = 0;

for (const story of stories) {
  const storyDir = path.join(storiesRoot, story.id);
  const chaptersDir = path.join(storyDir, "chapters");
  fs.mkdirSync(chaptersDir, { recursive: true });

  story.pages.forEach((page, i) => {
    const n = i + 1;
    // Which fixed-cast characters appear on this page (keys must match charators/<key>.png).
    // Their reference images are passed into generation so they stay identical across pages.
    const chars = (page.characters || story.pageCharacters?.[i] || []).join(", ");
    const content = `Story: ${page.story}\n\nIllustration: ${page.illustration}\n\nCharators: ${chars}\n`;
    fs.writeFileSync(path.join(chaptersDir, `${n}.md`), content, "utf-8");
    totalFiles++;
  });

  // Theme/genre tags shown as chips on the library card.
  if (story.tags && story.tags.length) {
    fs.writeFileSync(path.join(storyDir, "tags.txt"), story.tags.join(", ") + "\n", "utf-8");
  }

  console.log(`Seeded "${story.id}" — ${story.pages.length} pages${story.tags ? `, tags: ${story.tags.join(", ")}` : ""}.`);
}

console.log(`\nDone. Wrote ${totalFiles} chapter file(s) across ${stories.length} story/stories.`);
