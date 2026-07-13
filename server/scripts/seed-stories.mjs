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
    pageCharacters: [
      [], [], ["martha"], ["robin"], ["robin"], [], [], [], ["dickon"], ["dickon"],
      [], ["colin"], ["colin"], ["colin", "dickon"], ["colin"], ["colin"], ["colin", "dickon"], ["colin"],
    ],
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
    pageCharacters: [
      ["velveteen rabbit"], ["velveteen rabbit"], ["velveteen rabbit"], ["velveteen rabbit", "rocking horse"],
      ["velveteen rabbit"], ["velveteen rabbit"], ["velveteen rabbit"], ["velveteen rabbit"], ["velveteen rabbit"],
      ["velveteen rabbit"], ["velveteen rabbit"], ["velveteen rabbit", "nursery fairy"], ["nursery fairy"], [],
    ],
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
    pageCharacters: [
      ["happy prince"], ["swallow", "happy prince"], ["happy prince"], ["happy prince", "swallow"], ["swallow"],
      ["happy prince", "swallow"], ["swallow"], ["swallow"], [], ["swallow"], ["swallow"], [], ["swallow"], [],
    ],
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

  {
    id: "t8-a-little-princess",
    tags: ["Classic", "Kindness", "Resilience"],
    pageCharacters: [
      [], ["miss minchin"], [], ["becky"], ["miss minchin"], ["becky"], [], ["becky"],
      ["ram dass"], [], ["ram dass"], ["becky"], ["miss minchin"], ["ram dass"], [], [], ["miss minchin"], ["becky"],
    ],
    pages: [
      { story: "MAIN_CHARACTER arrived in foggy London with a loving father, who left MAIN_CHARACTER at a grand boarding school before sailing far away for his work.", illustration: `MAIN_CHARACTER as a well-dressed child arriving by carriage at a grand London boarding school on a foggy day, a kind father saying goodbye, wistful, ${STYLE}` },
      { story: "The strict headmistress, Miss Minchin, welcomed MAIN_CHARACTER with a cold, thin smile, giving the new pupil the finest room and calling MAIN_CHARACTER 'our little princess.'", illustration: `A tall stern headmistress with a sharp face and dark dress greeting MAIN_CHARACTER coolly in an ornate school parlor, other girls watching, ${STYLE}` },
      { story: "MAIN_CHARACTER was clever and kind, telling wonderful stories and sharing treats, imagining the plainest things into palaces and magic.", illustration: `MAIN_CHARACTER sitting among delighted schoolgirls telling an animated story by candlelight in a cozy dormitory, imaginative and warm, ${STYLE}` },
      { story: "In the cold kitchen MAIN_CHARACTER befriended Becky, a tired little scullery maid, and treated her as a true and equal friend.", illustration: `MAIN_CHARACTER kindly sharing a bun with Becky, a small scullery maid in a smudged apron, in a dim stone kitchen, gentle friendship, ${STYLE}` },
      { story: "Then dreadful news came: MAIN_CHARACTER's father was lost and his fortune gone. Miss Minchin, cross and cruel, sent MAIN_CHARACTER to a cold bare attic to work as a servant.", illustration: `The stern headmistress pointing sternly up a narrow staircase as a sad MAIN_CHARACTER in a thin dress carries a candle toward a bleak attic, ${STYLE}` },
      { story: "Though cold and hungry, MAIN_CHARACTER stayed brave and kind, and Becky crept up to the attic so the two friends could share their troubles and their dreams.", illustration: `MAIN_CHARACTER and Becky huddled together under a thin blanket in a bare candle-lit attic, whispering and smiling bravely, tender, ${STYLE}` },
      { story: "'I shall pretend I am a princess still,' MAIN_CHARACTER decided, 'for a princess is always gentle and kind, even in rags.' And so imagination kept the cold away.", illustration: `MAIN_CHARACTER standing tall and dignified in patched clothes in the bare attic, imagining a shimmering crown, moonlight through a skylight, hopeful, ${STYLE}` },
      { story: "Even with almost nothing, MAIN_CHARACTER shared a few pennies' worth of buns with hungry children on the street, and with dear Becky most of all.", illustration: `MAIN_CHARACTER handing warm buns to ragged street children in the snow, Becky beside them, selfless kindness, soft golden bakery light, ${STYLE}` },
      { story: "Across the way lived a kind gentleman with a servant named Ram Dass, whose little monkey once scampered right into MAIN_CHARACTER's attic window.", illustration: `A gentle Indian manservant in a bright turban, Ram Dass, smiling from a neighbouring window as a small monkey hops toward MAIN_CHARACTER's attic, ${STYLE}` },
      { story: "That night, MAIN_CHARACTER shivered and dreamed of warmth, never guessing that kind eyes had seen how cold and bare the little attic truly was.", illustration: `MAIN_CHARACTER asleep and shivering on a thin cot in a cold empty attic at night, a single candle guttering, moonlight, quiet and poignant, ${STYLE}` },
      { story: "While MAIN_CHARACTER slept, Ram Dass and his master crept in with a secret gift — filling the attic with a warm fire, soft blankets, and a wonderful feast.", illustration: `Ram Dass quietly arranging warm rugs, a glowing fire, cushions and a feast in the attic while MAIN_CHARACTER sleeps, magical secret kindness, ${STYLE}` },
      { story: "MAIN_CHARACTER woke to a glowing fire and a table piled with food, and could scarcely believe the magic — then ran to bring Becky to share it all.", illustration: `MAIN_CHARACTER waking in astonishment to a transformed cozy attic with a warm fire and a laden table, joyful and amazed, warm firelight, ${STYLE}` },
      { story: "Miss Minchin grew suspicious of the warm attic and the happy child, but MAIN_CHARACTER only smiled and kept being kind to everyone.", illustration: `The stern headmistress peering suspiciously into the now-cozy attic while MAIN_CHARACTER stands calm and kind by the fire, ${STYLE}` },
      { story: "The little monkey visited again, and MAIN_CHARACTER carried it gently back next door — and there met the kind gentleman face to face at last.", illustration: `MAIN_CHARACTER cradling the small monkey and meeting the kind bearded gentleman and Ram Dass at the neighbouring doorway, warm meeting, ${STYLE}` },
      { story: "The gentleman had been searching all this time for the lost child of his dearest friend — and with a joyful start, he realised it was MAIN_CHARACTER.", illustration: `The kind gentleman clasping MAIN_CHARACTER's hands with tearful joy in a warm study lined with books, a portrait on the wall, emotional reunion, ${STYLE}` },
      { story: "MAIN_CHARACTER's father had not been lost after all, and his fortune was restored — and MAIN_CHARACTER was a real princess of kindness once more.", illustration: `MAIN_CHARACTER dressed warmly and happily in a grand cozy parlor, the kind gentleman beside them, a diamond of light, joyful and bright, ${STYLE}` },
      { story: "Miss Minchin blustered and fumed, but it was too late — her cruelty had won her nothing, and MAIN_CHARACTER simply forgave her and walked away smiling.", illustration: `The stern headmistress looking flustered and small in a doorway as MAIN_CHARACTER walks past with quiet grace and forgiveness, ${STYLE}` },
      { story: "Best of all, MAIN_CHARACTER took dear Becky along to a warm new home, and the two friends were never cold or hungry again.", illustration: `MAIN_CHARACTER and a beaming Becky arriving together at a warm welcoming home, hand in hand, snow outside but cozy within, happy ending, ${STYLE}` },
    ],
  },

  {
    id: "t16-the-wind-in-the-willows",
    tags: ["Classic", "Animals", "Friendship"],
    pageCharacters: [
      [], ["mole"], ["mole", "ratty"], ["ratty"], ["toad"], ["toad"], ["badger"], ["toad", "badger"],
      ["toad"], [], ["toad"], ["mole", "ratty", "badger"], ["mole", "ratty", "toad", "badger"],
      ["mole", "ratty", "toad", "badger"], ["toad"], ["mole", "ratty", "toad", "badger"],
    ],
    pages: [
      { story: "One bright spring morning, MAIN_CHARACTER wandered down to the sparkling river, where the reeds whispered and the water sang a gentle song.", illustration: `MAIN_CHARACTER as a child exploring a lush green riverbank in spring, sparkling water, reeds and wildflowers, sunlight, cheerful, ${STYLE}` },
      { story: "Up popped Mole from his tunnel, blinking in the sunshine. 'Hello!' he said, and at once MAIN_CHARACTER had made a gentle new friend.", illustration: `A small friendly velvety mole in a little waistcoat popping up from the earth to greet MAIN_CHARACTER on the riverbank, delightful meeting, ${STYLE}` },
      { story: "Mole introduced cheerful Ratty the Water Rat, who rowed MAIN_CHARACTER and Mole down the river in his little blue boat.", illustration: `MAIN_CHARACTER, the mole, and a cheerful water rat in a small blue rowing boat gliding down a green river, dappled sunlight, joyful, ${STYLE}` },
      { story: "They spread a fine picnic on the grassy bank, and Ratty declared there was nothing half so wonderful as simply messing about in boats.", illustration: `MAIN_CHARACTER, mole and water rat enjoying a riverside picnic basket on a checkered blanket by the boat, contented summer afternoon, ${STYLE}` },
      { story: "Soon they visited grand Toad Hall to see Mr Toad, a plump and boastful fellow forever chasing his newest craze.", illustration: `MAIN_CHARACTER and friends arriving at a grand ivy-covered riverside manor, greeted by a boastful plump green toad in a fine checked coat, ${STYLE}` },
      { story: "'Poop-poop!' cried Toad, who had fallen madly in love with a shiny motorcar and could talk of nothing else.", illustration: `A plump green toad in driving goggles gleefully sitting in a shiny old-fashioned motorcar, MAIN_CHARACTER watching with amusement, ${STYLE}` },
      { story: "In the Wild Wood they met wise old Badger, gruff but kind, who worried that silly Toad would land himself in trouble.", illustration: `MAIN_CHARACTER meeting a large wise gruff badger with a black-and-white striped face in a cozy burrow deep in a shadowy wood, warm firelight, ${STYLE}` },
      { story: "Badger sat Toad down and scolded him firmly, and Toad promised — with a great big sniff — to give up his reckless motorcars.", illustration: `The stern kindly badger lecturing a sheepish plump toad by the fire while MAIN_CHARACTER looks on, cozy burrow, gently humorous, ${STYLE}` },
      { story: "But the very next day Toad forgot his promise, borrowed a motorcar, crashed it with a mighty splash, and was carted off to prison!", illustration: `A plump toad comically crashing an old motorcar into a pond with a big splash, MAIN_CHARACTER gasping nearby, lively and funny, ${STYLE}` },
      { story: "MAIN_CHARACTER worried terribly about poor foolish Toad, locked far away in a damp, gloomy dungeon.", illustration: `MAIN_CHARACTER looking worried on the riverbank at dusk, imagining a sad toad behind bars in a gloomy stone dungeon (as a thought), ${STYLE}` },
      { story: "Clever Toad escaped at last, disguised in a washerwoman's dress, and came hurrying home with a wild and boastful tale.", illustration: `A plump toad comically disguised in a washerwoman's bonnet and shawl scurrying along a country lane, MAIN_CHARACTER helping, humorous, ${STYLE}` },
      { story: "But dreadful news awaited: while Toad was away, sneaky weasels had taken over Toad Hall! MAIN_CHARACTER, Mole, Ratty and Badger vowed to win it back.", illustration: `MAIN_CHARACTER, mole, water rat and badger huddled with determined faces plotting outside a grand manor where sly weasels peek from windows, ${STYLE}` },
      { story: "Through a secret underground tunnel they crept, and burst in all together to surprise the startled weasels.", illustration: `MAIN_CHARACTER, mole, water rat, toad and badger charging bravely out of a secret tunnel into a grand hall, startled weasels scattering, dynamic, ${STYLE}` },
      { story: "With a mighty, merry battle, the friends chased every last weasel out the door, and Toad Hall was won back at last.", illustration: `A lively comic battle in a grand hall as MAIN_CHARACTER and the animal friends drive fleeing weasels out the doors, triumphant and fun, ${STYLE}` },
      { story: "Toad, humbled and grateful, hugged his friends and promised — truly this time — to be a wiser and kinder toad.", illustration: `A tearful grateful plump toad hugging MAIN_CHARACTER and the animal friends in the grand hall, warm and heartfelt reconciliation, ${STYLE}` },
      { story: "And so they feasted together by the whispering river, the very best of friends, as the willows swayed softly in the wind.", illustration: `MAIN_CHARACTER, mole, water rat, toad and badger feasting joyfully at a long table by the river under swaying willows at golden sunset, ${STYLE}` },
    ],
  },

  {
    id: "t17-pollyanna",
    tags: ["Classic", "Kindness", "Uplifting"],
    pageCharacters: [
      [], ["nancy"], ["aunt polly"], ["nancy"], [], ["john pendleton"], ["john pendleton"],
      ["dr chilton"], [], ["aunt polly"], [], [], ["aunt polly"], [], ["dr chilton"], ["aunt polly"],
    ],
    pages: [
      { story: "MAIN_CHARACTER was an orphan with the sunniest heart, travelling to a new town to live with a stern, wealthy aunt who had never met the child.", illustration: `MAIN_CHARACTER as a bright cheerful orphan child with a little suitcase riding a train toward a small pretty town, hopeful and sunny, ${STYLE}` },
      { story: "At the station, a kind maid named Nancy met MAIN_CHARACTER, surprised by how gladly the child chattered about everything under the sun.", illustration: `A cheerful young housemaid with a mob cap warmly greeting MAIN_CHARACTER at a small country train station, friendly and bright, ${STYLE}` },
      { story: "Aunt Polly was proper and cold, and gave MAIN_CHARACTER a bare little attic room. But MAIN_CHARACTER just smiled and found something to be glad about.", illustration: `A stiff stern middle-aged woman in a dark high-collared dress showing MAIN_CHARACTER a plain bare attic room, the child smiling gently, ${STYLE}` },
      { story: "MAIN_CHARACTER taught Nancy the wonderful 'Glad Game' — always finding one thing to be glad about, no matter how hard the day.", illustration: `MAIN_CHARACTER happily explaining a game to the delighted young maid Nancy in a sunny kitchen, warm and uplifting, ${STYLE}` },
      { story: "From the attic window MAIN_CHARACTER could see the whole town and the far green hills, and was glad, so glad, for such a lovely view.", illustration: `MAIN_CHARACTER gazing out a small attic window at a pretty town and rolling green hills bathed in golden light, joyful and content, ${STYLE}` },
      { story: "In a big gloomy house lived Mr Pendleton, a gruff and lonely man whom everyone feared — but MAIN_CHARACTER only greeted him with a bright smile.", illustration: `MAIN_CHARACTER cheerfully waving at a grumpy lonely bearded gentleman on the steps of a large gloomy mansion, warm afternoon light, ${STYLE}` },
      { story: "Day by day MAIN_CHARACTER's gladness melted Mr Pendleton's frown, until the lonely old man laughed for the first time in years.", illustration: `The once-grumpy bearded gentleman laughing warmly with MAIN_CHARACTER in a sunlit garden, flowers blooming, heartwarming transformation, ${STYLE}` },
      { story: "MAIN_CHARACTER also cheered the kind, lonely Dr Chilton, and slowly the whole town began to catch the happy 'glad' feeling.", illustration: `MAIN_CHARACTER chatting brightly with a gentle young doctor holding a small medical bag on a sunny town street, friendly and warm, ${STYLE}` },
      { story: "Everywhere MAIN_CHARACTER went, gladness followed — neighbours smiled, quarrels softened, and the little town grew warmer and kinder.", illustration: `MAIN_CHARACTER skipping happily through a cheerful town square where smiling neighbours greet one another, flowers and sunshine, uplifting, ${STYLE}` },
      { story: "Even stern Aunt Polly began, ever so slowly, to soften — though she would never quite admit how much she had come to love the child.", illustration: `The stern aunt watching MAIN_CHARACTER from a window with the faintest tender smile beginning to soften her face, warm interior light, ${STYLE}` },
      { story: "One golden afternoon, full of gladness, MAIN_CHARACTER ran home singing across the sunny road.", illustration: `MAIN_CHARACTER running joyfully home along a sunny tree-lined road, singing, dappled golden light, carefree and happy, ${STYLE}` },
      { story: "But then a terrible accident befell MAIN_CHARACTER, who could no longer walk — and for once, even the Glad Game felt very hard to play.", illustration: `MAIN_CHARACTER resting in bed by a window looking quietly brave, soft muted light, a gentle and tender moment, hopeful despite sadness, ${STYLE}` },
      { story: "Aunt Polly's cold heart broke open with love, and she stayed by MAIN_CHARACTER's side, realising at last how dear the child had become.", illustration: `The stern aunt now tender and tearful, holding MAIN_CHARACTER's hand devotedly at the bedside, warm lamplight, deeply emotional, ${STYLE}` },
      { story: "The whole grateful town came calling, each one telling MAIN_CHARACTER how the Glad Game had brightened their lives — and gladness flowed back.", illustration: `A stream of kind townsfolk visiting MAIN_CHARACTER's room with flowers and gifts and warm smiles, love and gratitude filling the space, ${STYLE}` },
      { story: "Kind Dr Chilton found a way to help, and with time and hope and love, MAIN_CHARACTER learned to take slow, glad steps once more.", illustration: `The gentle doctor and a joyful Aunt Polly cheering as MAIN_CHARACTER takes brave first steps again in a sunny room, triumphant and tender, ${STYLE}` },
      { story: "And MAIN_CHARACTER, walking once again, filled the whole town — and Aunt Polly's warm and loving home — with gladness for ever after.", illustration: `MAIN_CHARACTER walking happily hand in hand with a now-loving Aunt Polly through a bright town full of smiling neighbours and blossoms, joyful finale, ${STYLE}` },
    ],
  },

  {
    id: "t7-treasure-island",
    tags: ["Adventure", "Pirates", "Classic"],
    pageCharacters: [
      ["billy bones"], ["billy bones"], [], ["captain smollett"], [], ["long john silver"], ["long john silver"],
      [], ["long john silver"], ["captain smollett"], [], ["ben gunn"], ["captain smollett"], ["long john silver"],
      [], ["ben gunn"], ["long john silver"], [],
    ],
    pages: [
      { story: "MAIN_CHARACTER lived at a quiet seaside inn, until an old sea captain named Billy Bones came to stay, humming songs of pirates and gold.", illustration: `MAIN_CHARACTER as a child at a cozy seaside inn beside a weathered old sea captain in a blue coat and tricorn hat with a battered sea chest, ${STYLE}` },
      { story: "Billy Bones feared a one-legged man, and one stormy night the old sailor's heart gave out — leaving behind his mysterious locked chest.", illustration: `MAIN_CHARACTER peering at a heavy old sea chest by candlelight in a storm-lashed inn room, the old captain's coat on a chair, eerie and tense, ${STYLE}` },
      { story: "Inside the chest MAIN_CHARACTER found a faded map marked with a red X — the map to Captain Flint's buried pirate treasure!", illustration: `MAIN_CHARACTER unrolling an old treasure map with a red X and a compass rose on a wooden table, wide-eyed with excitement, warm lamplight, ${STYLE}` },
      { story: "MAIN_CHARACTER showed the map to the good doctor and squire, who hired a fine ship and a stern, trusty captain named Smollett.", illustration: `MAIN_CHARACTER showing the treasure map to a stern upright ship's captain in a navy coat holding a spyglass, on a busy harbour dock, ${STYLE}` },
      { story: "And so the ship Hispaniola set sail across the wide blue sea, her white sails full of wind and adventure.", illustration: `A grand tall sailing ship with billowing white sails cutting across sparkling blue ocean, MAIN_CHARACTER waving from the deck, gulls overhead, ${STYLE}` },
      { story: "The ship's cook was Long John Silver, a jolly one-legged fellow with a crutch and a bright parrot that squawked 'Pieces of eight!'", illustration: `A charming one-legged ship's cook with a wooden crutch and a colourful parrot on his shoulder grinning at MAIN_CHARACTER in a ship's galley, ${STYLE}` },
      { story: "Silver was friendly and full of sea tales, and MAIN_CHARACTER liked him at once — never guessing his secret.", illustration: `Long John Silver telling lively sea stories to a delighted MAIN_CHARACTER on the sunny deck, sailors listening, parrot flapping, cheerful, ${STYLE}` },
      { story: "One evening MAIN_CHARACTER climbed into the apple barrel for a snack, and there, hidden inside, overheard whispering voices on the deck.", illustration: `MAIN_CHARACTER curled hidden inside a large wooden apple barrel on a moonlit ship deck, peeking out nervously at shadowy figures, suspenseful, ${STYLE}` },
      { story: "It was Silver — and he was a pirate! He and his crew were plotting mutiny to steal all the treasure for themselves.", illustration: `MAIN_CHARACTER's worried face peeking from the barrel as Long John Silver and rough pirates whisper and scheme in the moonlight on deck, tense, ${STYLE}` },
      { story: "MAIN_CHARACTER bravely warned Captain Smollett, and just then the lookout cried, 'Land ho!' — the treasure island rose green from the sea.", illustration: `MAIN_CHARACTER urgently whispering to the stern captain on deck as a lush green tropical island with a hill appears on the horizon, ${STYLE}` },
      { story: "MAIN_CHARACTER slipped ashore and crept through the wild jungle, where anything might be hiding among the palms.", illustration: `MAIN_CHARACTER exploring a dense lush tropical island jungle with tall palms and vines, cautious and curious, dappled adventurous light, ${STYLE}` },
      { story: "There MAIN_CHARACTER met Ben Gunn, a ragged sailor marooned for years, wild-haired and lonely but kind at heart.", illustration: `MAIN_CHARACTER meeting a ragged wild-haired marooned sailor in tattered goat-skin clothes among jungle rocks, wary then friendly, ${STYLE}` },
      { story: "The loyal friends took shelter in an old log stockade, while Captain Smollett kept careful watch for the pirates.", illustration: `MAIN_CHARACTER and the captain behind a wooden log stockade fence on the island at dusk, a small campfire, keeping watch, tense but brave, ${STYLE}` },
      { story: "The pirates attacked, but MAIN_CHARACTER kept a cool head, and even crept off alone to cut the ship loose from its anchor.", illustration: `MAIN_CHARACTER bravely rowing a tiny boat toward the anchored ship at night while Long John Silver's pirates shout from the shore, dramatic, ${STYLE}` },
      { story: "MAIN_CHARACTER cleverly set the Hispaniola adrift so the pirates could never sail away with the gold.", illustration: `MAIN_CHARACTER triumphantly cutting a thick anchor rope aboard the moonlit ship, the sails catching wind, clever and daring, ${STYLE}` },
      { story: "Then came the greatest surprise: Ben Gunn had found the treasure long ago and hidden it safe in his secret cave!", illustration: `Ben Gunn proudly showing MAIN_CHARACTER a cave glittering with piles of gold coins, jewels and treasure chests, warm torchlight, wondrous, ${STYLE}` },
      { story: "The pirates were outwitted, and even sly Long John Silver — half rascal, half friend — was let off with a wink and a warning.", illustration: `Long John Silver tipping his hat with a sheepish grin to MAIN_CHARACTER on a sunny beach, treasure chests stacked nearby, bittersweet and warm, ${STYLE}` },
      { story: "And so MAIN_CHARACTER sailed home a hero, the hold full of glittering gold and the head full of grand sea tales.", illustration: `MAIN_CHARACTER standing proudly at the bow of the ship sailing home over sparkling seas at golden sunset, treasure aboard, triumphant, ${STYLE}` },
    ],
  },

  {
    id: "t14-robinson-crusoe",
    tags: ["Adventure", "Survival", "Classic"],
    pageCharacters: [
      [], [], [], [], [], ["parrot"], [], [], [], ["friday"], ["friday"], ["friday"], ["friday", "parrot"], [], ["friday"], ["friday"],
    ],
    pages: [
      { story: "MAIN_CHARACTER dreamed of the sea, and one bright day set sail on a great ship bound for faraway lands.", illustration: `MAIN_CHARACTER as a child waving excitedly from the deck of a tall sailing ship leaving a harbour under blue skies, adventurous and hopeful, ${STYLE}` },
      { story: "But a mighty storm rose up, tossing the ship on giant waves until it was wrecked upon the rocks.", illustration: `A small ship tossed by enormous stormy waves and dark clouds, MAIN_CHARACTER clinging bravely to the mast, dramatic and thrilling, ${STYLE}` },
      { story: "MAIN_CHARACTER washed ashore, all alone, on a wild and beautiful deserted island ringed with palm trees.", illustration: `MAIN_CHARACTER lying safe on a sunny tropical beach beside gentle waves, palm trees and green hills behind, relieved and awed, ${STYLE}` },
      { story: "From the broken ship MAIN_CHARACTER carried tools, seeds and sailcloth ashore, ready to build a whole new life.", illustration: `MAIN_CHARACTER wading from a shipwreck to shore carrying a crate of tools and supplies, determined and resourceful, bright daylight, ${STYLE}` },
      { story: "With clever hands, MAIN_CHARACTER built a snug shelter against the hillside, safe from sun and rain.", illustration: `MAIN_CHARACTER building a cozy shelter of wood and sailcloth against a rocky green hillside on the island, proud and busy, warm light, ${STYLE}` },
      { story: "A bright parrot became MAIN_CHARACTER's first friend, learning to chirp a cheerful 'good morning' from the trees.", illustration: `A colourful red-blue-and-yellow parrot perched on MAIN_CHARACTER's shoulder outside the island shelter, cheerful companionship, sunny, ${STYLE}` },
      { story: "MAIN_CHARACTER planted grain, tamed wild goats, and scratched a calendar into a post — growing braver each day.", illustration: `MAIN_CHARACTER tending a small garden and friendly goats beside the shelter, a notched wooden calendar post nearby, content island life, ${STYLE}` },
      { story: "Then one day, on the far sand, MAIN_CHARACTER found something astonishing — a single fresh footprint that was not their own.", illustration: `MAIN_CHARACTER staring in surprise at a single bare footprint pressed into wet beach sand, tropical shore behind, mysterious and tense, ${STYLE}` },
      { story: "MAIN_CHARACTER watched and waited, wondering who else might share this lonely island.", illustration: `MAIN_CHARACTER peering watchfully from behind palm trees across an empty tropical beach at dusk, cautious and curious, ${STYLE}` },
      { story: "At last MAIN_CHARACTER bravely rescued a kind young man from danger, and named him Friday, for the day they met.", illustration: `MAIN_CHARACTER reaching out to help a kind young island man to safety on the beach, a moment of courage and friendship, warm light, ${STYLE}` },
      { story: "MAIN_CHARACTER and Friday became the truest of friends, sharing every task, meal and adventure.", illustration: `MAIN_CHARACTER and Friday, a friendly young island companion, laughing together around a beach campfire at sunset, warm friendship, ${STYLE}` },
      { story: "They taught each other words and games, and built a fine home together with two pairs of willing hands.", illustration: `MAIN_CHARACTER and Friday working happily together to build a larger island home from wood and palm leaves, teamwork and joy, ${STYLE}` },
      { story: "The days were bright and happy, with the parrot singing and the island blooming green all around them.", illustration: `MAIN_CHARACTER and Friday relaxing contentedly outside their island home, the colourful parrot overhead, lush greenery and blue sea, idyllic, ${STYLE}` },
      { story: "Then one morning MAIN_CHARACTER spotted white sails far out at sea — a ship, at last, a real ship!", illustration: `MAIN_CHARACTER pointing excitedly out to sea where a tall sailing ship appears on the sparkling horizon, hope and joy, morning light, ${STYLE}` },
      { story: "MAIN_CHARACTER and Friday lit a great signal fire, and the ship turned toward the island to bring them home.", illustration: `MAIN_CHARACTER and Friday waving beside a tall blazing signal bonfire on the beach as a ship turns toward them, triumphant and joyful, ${STYLE}` },
      { story: "And so the two friends sailed away together, side by side, off to a whole new life of adventure.", illustration: `MAIN_CHARACTER and Friday standing happily together at the rail of a ship sailing away from the island at golden sunset, hopeful finale, ${STYLE}` },
    ],
  },

  {
    id: "t20-the-call-of-the-wild",
    tags: ["Adventure", "Animals", "Classic"],
    pageCharacters: [
      ["buck"], ["buck"], ["buck"], [], ["buck"], ["john thornton"], ["john thornton", "buck"], ["buck"],
      ["john thornton"], ["buck"], ["buck"], [], ["buck"], ["john thornton", "buck"], ["buck"],
    ],
    pages: [
      { story: "In the frozen white north lived MAIN_CHARACTER and a great loyal dog named Buck, the best of friends beneath the snowy pines.", illustration: `MAIN_CHARACTER as a child hugging Buck, a huge loyal tawny-brown sled dog, in a snowy pine forest under soft northern light, warm bond, ${STYLE}` },
      { story: "Together they joined a sled team, carrying the mail on long journeys across the glittering, frozen wild.", illustration: `MAIN_CHARACTER riding a dog sled pulled by a team of huskies with Buck in the lead, racing across bright snowy wilderness, dynamic, ${STYLE}` },
      { story: "Strong and clever, Buck learned to lead the whole team, and the other dogs followed him proudly through the snow.", illustration: `Buck the big sled dog leading a team of huskies across a frozen plain, MAIN_CHARACTER cheering from the sled, snowy mountains behind, ${STYLE}` },
      { story: "Through howling blizzards and icy nights they travelled, MAIN_CHARACTER bundled warm and Buck never faltering.", illustration: `MAIN_CHARACTER bundled in furs on a sled in a swirling snowy blizzard, the dog team pushing bravely on, wild and atmospheric, ${STYLE}` },
      { story: "With every mile Buck grew braver and stronger, his warm eyes shining with courage and love.", illustration: `A close warm portrait of Buck the noble sled dog resting by a campfire in the snow, MAIN_CHARACTER's hand on his fur, tender, ${STYLE}` },
      { story: "One day they met John Thornton, a kind gold-seeker with a warm laugh and a warmer heart.", illustration: `MAIN_CHARACTER meeting a rugged kind bearded gold-prospector in a fur-lined coat by a snowy river camp, friendly and warm, ${STYLE}` },
      { story: "Thornton, MAIN_CHARACTER and Buck became a happy team, panning for gold and camping beneath the northern stars.", illustration: `MAIN_CHARACTER, John Thornton and Buck together at a cozy riverside camp under a starry northern sky with green auroras, warm firelight, ${STYLE}` },
      { story: "When MAIN_CHARACTER slipped on the ice and fell toward the freezing river, brave Buck leapt in and pulled them to safety.", illustration: `Buck the mighty dog heroically pulling MAIN_CHARACTER from an icy rushing river, splashing and dramatic, snowy banks, thrilling rescue, ${STYLE}` },
      { story: "Safe and grateful by the crackling fire, they hugged Buck close, thankful for such a loyal, loving friend.", illustration: `MAIN_CHARACTER and John Thornton hugging a wet, heroic Buck warm by a blazing campfire in the snow, grateful and cozy, ${STYLE}` },
      { story: "On quiet nights, Buck lifted his head, for far away in the hills the wild wolves were calling to him.", illustration: `Buck standing on a snowy ridge at night, ears up, gazing toward distant howling wolves under a huge moon, wild and stirring, ${STYLE}` },
      { story: "Buck felt the pull of the wild in his heart, yet his love for MAIN_CHARACTER held him close by the fire.", illustration: `Buck looking thoughtfully between the moonlit wild forest and MAIN_CHARACTER sleeping by the tent, torn and tender, snowy night, ${STYLE}` },
      { story: "Then danger crept near the camp one dark night, with growls and shadows among the trees.", illustration: `Menacing shadows and glowing eyes among snowy pines near a small camp at night, MAIN_CHARACTER asleep, tense and suspenseful, ${STYLE}` },
      { story: "But mighty Buck stood tall and fierce, guarding MAIN_CHARACTER and driving every danger away.", illustration: `Buck standing brave and powerful, fur bristling, protecting MAIN_CHARACTER before their tent as shadows flee into the snowy dark, heroic, ${STYLE}` },
      { story: "Safe once more, MAIN_CHARACTER and Thornton knew there was no friend in all the north so brave and true as Buck.", illustration: `MAIN_CHARACTER and John Thornton embracing Buck joyfully in the morning snow, sunrise over the mountains, deep loving bond, ${STYLE}` },
      { story: "And though Buck sometimes answered the call of the wild and ran with the wolves, he always came home to MAIN_CHARACTER, his heart.", illustration: `Buck running joyfully across a moonlit snowy meadow with distant wolves, then looking back warmly toward MAIN_CHARACTER's glowing cabin, ${STYLE}` },
    ],
  },

  {
    id: "t12-the-ugly-duckling",
    tags: ["Fairy Tale", "Kindness", "Classic"],
    pageCharacters: [
      ["mother duck"], ["mother duck", "ugly duckling"], ["ugly duckling"], ["ugly duckling"], ["ugly duckling"],
      ["ugly duckling"], ["ugly duckling"], [], [], [], [], [], [], [],
    ],
    pages: [
      { story: "On a sunny farm by a pond, MAIN_CHARACTER watched a kind mother duck's eggs hatch — and one was much bigger than all the rest.", illustration: `MAIN_CHARACTER as a child kneeling by a sunny farm pond watching a plump white mother duck's eggs hatch, cheerful, ${STYLE}` },
      { story: "Out tumbled a grey, gawky duckling, quite unlike its fluffy yellow brothers and sisters, and the other animals called it ugly.", illustration: `A plump white mother duck with fluffy yellow ducklings and one large gawky grey duckling on a green pond bank, ${STYLE}` },
      { story: "But MAIN_CHARACTER thought the odd little duckling was rather sweet, and shared soft crumbs of bread with it by the water.", illustration: `MAIN_CHARACTER gently offering breadcrumbs to the sweet grey gawky duckling by the water's edge, kind and warm, ${STYLE}` },
      { story: "The farmyard creatures teased and pecked the poor duckling, until it hid, lonely and sad, among the tall green reeds.", illustration: `Farmyard animals pecking and teasing the sad grey duckling as it hides among tall green reeds, poignant, ${STYLE}` },
      { story: "MAIN_CHARACTER found it shivering there and gently wrapped it in a warm scarf, whispering, 'Don't be sad — you're my friend.'", illustration: `MAIN_CHARACTER wrapping the shivering grey duckling in a warm scarf and whispering to it, tender friendship, ${STYLE}` },
      { story: "As the autumn winds blew cold, the little duckling set off to find where it might truly belong, and MAIN_CHARACTER waved goodbye.", illustration: `MAIN_CHARACTER waving goodbye as the grey duckling waddles away down an autumn path with falling leaves, wistful, ${STYLE}` },
      { story: "Through frost and snow the duckling wandered all alone, cold and weary, dreaming of a place to call home.", illustration: `The lonely grey duckling trudging through frost and snowy reeds under a grey winter sky, cold and brave, ${STYLE}` },
      { story: "All winter MAIN_CHARACTER worried, leaving seeds and bread by the frozen pond in case the little friend ever came back.", illustration: `MAIN_CHARACTER scattering seeds and bread by a frozen pond in winter, looking hopefully for a friend, ${STYLE}` },
      { story: "When spring melted the ice at last, a flock of dazzling white swans glided gracefully onto the shining pond.", illustration: `A flock of dazzling graceful white swans gliding onto a bright springtime pond, MAIN_CHARACTER watching in awe, ${STYLE}` },
      { story: "From the reeds stepped the 'duckling' — but it was grey no longer. It had grown tall and slender, with snowy feathers.", illustration: `A beautiful young white swan stepping gracefully from the spring reeds where the grey duckling once hid, radiant, ${STYLE}` },
      { story: "Bending to the water, it saw its reflection for the very first time: a beautiful swan gazing back in wonder.", illustration: `The young white swan bending to see its own reflection in the calm pond water for the first time, wonder, ${STYLE}` },
      { story: "MAIN_CHARACTER gasped with joy, for those gentle, kind eyes could belong to only one dear old friend.", illustration: `MAIN_CHARACTER gasping with joyful recognition at the beautiful white swan by the sunny pond, emotional, ${STYLE}` },
      { story: "The swan bent its graceful neck and nuzzled MAIN_CHARACTER's cheek, and the two friends were together again at last.", illustration: `The graceful white swan nuzzling MAIN_CHARACTER's cheek by the blossoming spring pond, heartwarming reunion, ${STYLE}` },
      { story: "And MAIN_CHARACTER learned that everyone grows into their own true beauty, exactly when the time is right.", illustration: `MAIN_CHARACTER and the elegant white swan together by a pond full of spring blossoms and sunlight, joyful finale, ${STYLE}` },
    ],
  },

  {
    id: "t13-thumbelina",
    tags: ["Fairy Tale", "Magical", "Adventure"],
    pageCharacters: [
      [], [], [], [], [], [], ["field mouse"], ["field mouse"], ["swallow"], ["swallow"], ["field mouse"], ["swallow"], [], [],
    ],
    pages: [
      { story: "A kind woman wished with all her heart for a tiny child, and a magic flower bloomed — and there sat MAIN_CHARACTER, no bigger than a thumb.", illustration: `A magical flower blooming to reveal tiny MAIN_CHARACTER no bigger than a thumb sitting on the petals, a kind woman gazing in wonder, ${STYLE}` },
      { story: "Tiny MAIN_CHARACTER slept in a smooth walnut shell and sailed across a bowl of water in a bright tulip-petal boat.", illustration: `Tiny MAIN_CHARACTER sailing a bright tulip-petal boat across a bowl of water with a walnut-shell bed nearby, whimsical, ${STYLE}` },
      { story: "One night a big warty toad crept in and carried little MAIN_CHARACTER away, wanting the tiny child for its very own.", illustration: `A big warty toad carrying tiny MAIN_CHARACTER away on a lily pad across a moonlit pond, dramatic but gentle, ${STYLE}` },
      { story: "But kind fish and a fluttering butterfly nibbled the lily pad free, and MAIN_CHARACTER floated safely down the sparkling stream.", illustration: `Friendly fish and a butterfly nibbling a lily pad free as tiny MAIN_CHARACTER floats safely down a sparkling stream, ${STYLE}` },
      { story: "A shiny beetle whisked MAIN_CHARACTER up into a tall tree, then flew away, leaving the tiny traveller all alone.", illustration: `A shiny beetle setting tiny MAIN_CHARACTER down on a high leafy branch and flying off, leaving the tiny child alone, ${STYLE}` },
      { story: "Through the long warm summer, MAIN_CHARACTER lived among the grasses, sipping dew and befriending the gentle bees.", illustration: `Tiny MAIN_CHARACTER living among tall summer grasses and gentle bees, sipping a dewdrop, sunny and small in scale, ${STYLE}` },
      { story: "But winter came bitter and cold, and a kind old field mouse took shivering MAIN_CHARACTER into her cozy little burrow.", illustration: `A kind plump field mouse in a shawl welcoming shivering tiny MAIN_CHARACTER into a cozy warm burrow in winter, ${STYLE}` },
      { story: "In the snug home MAIN_CHARACTER swept and told stories, though the field mouse wished the tiny child would marry a dull, grumpy mole.", illustration: `Tiny MAIN_CHARACTER sweeping and telling stories in a snug candlelit mouse burrow, cozy domestic warmth, ${STYLE}` },
      { story: "Down a dark tunnel MAIN_CHARACTER found a swallow, cold and still, and gently nursed the poor bird back to life.", illustration: `Tiny MAIN_CHARACTER gently tending a cold blue swallow lying in a dark earthen tunnel, caring and tender, ${STYLE}` },
      { story: "All winter MAIN_CHARACTER kept the swallow warm, and the two became the very dearest of friends.", illustration: `Tiny MAIN_CHARACTER and the recovered blue swallow as happy friends in the warm burrow, gentle bond, ${STYLE}` },
      { story: "When spring drew near, the gloomy mole pressed MAIN_CHARACTER to marry him, and the tiny child grew very sad indeed.", illustration: `Tiny MAIN_CHARACTER looking sad beside the kind field mouse as a gloomy grey mole visits, muted and wistful, ${STYLE}` },
      { story: "But just in time the healed swallow swooped down, and MAIN_CHARACTER climbed onto its back and soared up into the blue sky.", illustration: `Tiny MAIN_CHARACTER climbing onto the blue swallow's back as it soars up into a bright spring sky, joyful escape, ${STYLE}` },
      { story: "Over mountains and seas they flew, to a warm and sunny land bright with a thousand nodding flowers.", illustration: `The blue swallow carrying tiny MAIN_CHARACTER over mountains and seas toward a warm land of nodding flowers, sweeping vista, ${STYLE}` },
      { story: "There MAIN_CHARACTER met a tiny flower prince, was given delicate shimmering wings, and lived gladly ever after among the blossoms.", illustration: `Tiny MAIN_CHARACTER meeting a tiny flower prince and receiving delicate shimmering wings among bright blossoms, magical finale, ${STYLE}` },
    ],
  },

  {
    id: "t11-little-red-riding-hood",
    tags: ["Fairy Tale", "Classic", "Adventure"],
    pageCharacters: [
      [], [], ["the wolf"], ["the wolf"], [], ["the wolf"], ["the wolf"], [], ["the wolf"], ["the wolf"],
      ["woodsman"], ["woodsman", "the wolf"], ["grandmother", "woodsman"], ["grandmother"],
    ],
    pages: [
      { story: "MAIN_CHARACTER had a bright red hooded cloak and was called Little Red Riding Hood by everyone in the whole village.", illustration: `MAIN_CHARACTER as a child wearing a bright red hooded cloak in a cozy village cottage, cheerful and sweet, ${STYLE}` },
      { story: "One morning Mother packed a basket of bread and honey. 'Take these to Grandmother,' she said, 'and don't dawdle in the woods.'", illustration: `A kind mother packing a basket of bread and honey for MAIN_CHARACTER in a red cloak at a cottage door, warm morning light, ${STYLE}` },
      { story: "Along the leafy path, MAIN_CHARACTER met a sly grey wolf with a very toothy grin. 'Good day! And where are you off to?'", illustration: `MAIN_CHARACTER in the red cloak meeting a sly grey wolf with a toothy grin on a leafy sun-dappled forest path, ${STYLE}` },
      { story: "'To Grandmother's cottage,' said MAIN_CHARACTER. 'How lovely,' smiled the wolf. 'Why not pick her some pretty flowers along the way?'", illustration: `The sly grey wolf slyly gesturing toward wildflowers as MAIN_CHARACTER in red listens on the woodland path, ${STYLE}` },
      { story: "So MAIN_CHARACTER wandered off the path to gather a big, bright bunch of wildflowers, quite forgetting the time.", illustration: `MAIN_CHARACTER happily gathering a big bunch of colourful wildflowers among sunlit woods, carefree, ${STYLE}` },
      { story: "But the cunning wolf raced ahead through the trees, straight to Grandmother's cozy little cottage.", illustration: `The cunning grey wolf racing ahead through the forest trees toward a little cottage, sneaky and swift, ${STYLE}` },
      { story: "The wolf slipped inside, popped on a frilly nightcap, and hid beneath the covers, pretending to be Grandmother.", illustration: `The grey wolf wearing a frilly nightcap tucking itself under grandmother's bed covers, comically sneaky, ${STYLE}` },
      { story: "When MAIN_CHARACTER arrived at last, 'Grandmother' looked very strange indeed, tucked deep beneath the blankets.", illustration: `MAIN_CHARACTER in red peering curiously at a strange lumpy 'grandmother' deep under the blankets in a cottage bedroom, ${STYLE}` },
      { story: "'What big eyes you have!' said MAIN_CHARACTER. 'All the better to see you with!' 'And, oh, what big teeth you have!'", illustration: `MAIN_CHARACTER in red leaning close to the disguised wolf in the bed, noticing its big eyes and teeth, tense and wide-eyed, ${STYLE}` },
      { story: "'All the better to gobble you with!' growled the wolf, springing up from the bed with a great snarl.", illustration: `The grey wolf springing up from the bed with a snarl as MAIN_CHARACTER in red steps back startled, dramatic, ${STYLE}` },
      { story: "But a brave woodsman was passing nearby, and hearing the cry, he burst through the door with his mighty axe.", illustration: `A strong friendly woodsman with an axe bursting through the cottage door to the rescue, heroic, ${STYLE}` },
      { story: "The startled wolf leapt out the window and bolted away into the deep dark woods, never to bother anyone again.", illustration: `The woodsman chasing the frightened grey wolf as it leaps out a cottage window into the woods, dynamic, ${STYLE}` },
      { story: "Then out from the cupboard stepped Grandmother, safe and sound, and everyone hugged with happy relief.", illustration: `A sweet silver-haired grandmother in spectacles stepping safely from a cupboard to hug MAIN_CHARACTER and the woodsman, relief and joy, ${STYLE}` },
      { story: "MAIN_CHARACTER promised never to dawdle or talk to sly strangers again, and they all shared the bread and honey together.", illustration: `MAIN_CHARACTER, grandmother and the woodsman sharing bread and honey happily around a cozy cottage table, warm finale, ${STYLE}` },
    ],
  },

  {
    id: "t6-little-women",
    tags: ["Classic", "Family", "Heartwarming"],
    pageCharacters: [
      ["meg", "beth", "amy", "marmee"], ["marmee"], ["meg", "beth", "amy"], ["laurie"], ["laurie"], ["beth"],
      ["meg"], ["amy"], ["marmee"], ["beth"], ["laurie"], ["beth"], ["meg", "beth", "amy", "marmee", "laurie"], ["meg", "beth", "amy", "marmee"],
    ],
    pages: [
      { story: "In a cosy little house lived MAIN_CHARACTER with three dear sisters — gentle Meg, sweet Beth, and lively little Amy — and their loving mother, Marmee.", illustration: `MAIN_CHARACTER with three sisters and a kind mother gathered warmly around a fireplace in a cosy old-fashioned parlour at Christmas, loving family, ${STYLE}` },
      { story: "Their father was far away, so Marmee taught the children to be brave and kind, sharing what little they had with others.", illustration: `A warm mother (Marmee) reading a letter to MAIN_CHARACTER and sisters by candlelight, tender and hopeful, ${STYLE}` },
      { story: "On Christmas morning MAIN_CHARACTER and the sisters carried their own breakfast to a poor hungry family down the lane.", illustration: `MAIN_CHARACTER and three sisters carrying baskets of breakfast through the snow to a poor family's cottage, generous and kind, ${STYLE}` },
      { story: "Next door lived a lonely boy named Laurie, and MAIN_CHARACTER soon made him a warm and welcome friend.", illustration: `MAIN_CHARACTER cheerfully befriending a shy well-dressed boy, Laurie, over a garden fence by a grand house next door, ${STYLE}` },
      { story: "Laurie invited them to dances and games, and the big house next door rang with laughter it had not heard in years.", illustration: `MAIN_CHARACTER and Laurie laughing at a lively parlour dance with warm lamplight and music, joyful, ${STYLE}` },
      { story: "Gentle Beth loved music best, and Laurie's kind grandfather gave her a beautiful piano that made her eyes shine.", illustration: `Sweet shy sister Beth joyfully playing a beautiful piano as MAIN_CHARACTER watches with delight in a warm music room, ${STYLE}` },
      { story: "MAIN_CHARACTER dreamed of writing wonderful stories, scribbling away by candlelight up in the quiet attic.", illustration: `MAIN_CHARACTER writing eagerly with a quill by candlelight in a cozy cluttered attic, papers everywhere, imaginative, ${STYLE}` },
      { story: "Little Amy loved to draw and paint, though she sometimes got into the funniest scrapes with her big ideas.", illustration: `The youngest sister Amy painting at an easel with MAIN_CHARACTER helping, colourful and playful, sunny room, ${STYLE}` },
      { story: "One winter dear Beth fell ill, and MAIN_CHARACTER and Marmee nursed her tenderly through many worried nights.", illustration: `MAIN_CHARACTER and Marmee caring gently for a poorly Beth tucked in bed, warm lamplight, tender and hopeful, ${STYLE}` },
      { story: "With love and care, Beth grew well again, and the whole family wept with joy and hugged one another close.", illustration: `The family joyfully embracing a recovering Beth sitting up in bed, sunlight streaming in, relief and happiness, ${STYLE}` },
      { story: "Laurie and MAIN_CHARACTER shared many adventures — sledding, secret clubs, and the grandest of made-up plays.", illustration: `MAIN_CHARACTER and Laurie sledding down a snowy hill together, laughing, bright winter day, ${STYLE}` },
      { story: "Then, best of all, a letter came: Father was coming home at last, safe and well, in time for the holidays.", illustration: `MAIN_CHARACTER and sisters cheering over an open letter, Beth clapping, the family overjoyed by the fire, ${STYLE}` },
      { story: "The door opened, and there stood Father — and the little family was whole and happy together once more.", illustration: `A joyful reunion as a kind father in a coat embraces MAIN_CHARACTER, the sisters, Marmee and Laurie in a warm doorway, snow outside, ${STYLE}` },
      { story: "And through every joy and sorrow, MAIN_CHARACTER learned that the truest riches of all were love and family and home.", illustration: `MAIN_CHARACTER with the whole family and Laurie gathered warmly around a festive table, candles and love, heartwarming finale, ${STYLE}` },
    ],
  },

  {
    id: "t9-swiss-family-robinson",
    tags: ["Adventure", "Survival", "Family"],
    pageCharacters: [
      ["father", "mother"], [], ["father"], ["mother"], ["father"], [], ["father", "mother"], [],
      ["father"], [], ["mother"], ["father"], ["father", "mother"], [],
    ],
    pages: [
      { story: "MAIN_CHARACTER sailed the seas with a loving family, until a great storm wrecked their ship upon a hidden reef.", illustration: `MAIN_CHARACTER with a family clinging to a storm-tossed ship among giant waves near a rocky reef, dramatic and thrilling, ${STYLE}` },
      { story: "When the storm passed, they built a raft of barrels and floated safely to a wild, green, unknown island.", illustration: `MAIN_CHARACTER and family paddling a raft made of barrels toward a lush green tropical island under a clearing sky, hopeful, ${STYLE}` },
      { story: "Father was clever and strong, and helped MAIN_CHARACTER carry tools and treasures ashore from the broken ship.", illustration: `A resourceful father and MAIN_CHARACTER carrying crates and supplies onto a sunny tropical beach, busy and determined, ${STYLE}` },
      { story: "Mother found sweet fruits and fresh water, and made the family a cosy first camp beneath the swaying palms.", illustration: `A kind mother arranging a cosy beach camp with fruit and a cooking fire under tall palms, MAIN_CHARACTER helping, warm, ${STYLE}` },
      { story: "Together they built a wonderful tree house high in a giant tree, safe from any danger below.", illustration: `MAIN_CHARACTER and father building a marvellous wooden tree house high in a huge spreading tree, ropes and ladders, inventive, ${STYLE}` },
      { story: "MAIN_CHARACTER explored the island and discovered curious animals — flamingos, monkeys, and a giant friendly tortoise.", illustration: `MAIN_CHARACTER delightedly discovering flamingos, playful monkeys and a giant tortoise on a lush tropical island, wondrous, ${STYLE}` },
      { story: "The family planted a garden and tamed the wild goats, and every day the little island home grew snugger and finer.", illustration: `MAIN_CHARACTER, father and mother tending a thriving island garden with goats and chickens, happy homestead, sunny, ${STYLE}` },
      { story: "MAIN_CHARACTER learned to fish and swim and climb, growing braver and cleverer with each passing adventure.", illustration: `MAIN_CHARACTER happily fishing from rocks by a sparkling turquoise lagoon, tropical fish leaping, carefree, ${STYLE}` },
      { story: "When a fierce storm threatened their home, Father showed MAIN_CHARACTER how to stay calm and keep everyone safe.", illustration: `MAIN_CHARACTER and father securing the tree house against a tropical storm, working bravely together, dramatic, ${STYLE}` },
      { story: "Through every season they worked and played as a team, and the island truly became a home they loved.", illustration: `The family relaxing happily together outside their charming island tree house at golden sunset, contented, ${STYLE}` },
      { story: "One clear morning, MAIN_CHARACTER spotted white sails far out at sea — a real ship, come at last!", illustration: `MAIN_CHARACTER and mother pointing excitedly at a tall sailing ship on the sparkling horizon from an island cliff, joyful hope, ${STYLE}` },
      { story: "They lit a great signal fire, and the ship turned toward their island to carry the family home.", illustration: `MAIN_CHARACTER and father waving beside a blazing signal fire on the beach as a ship approaches, triumphant, ${STYLE}` },
      { story: "But they had grown to love their green island so, that they promised to remember it always in their hearts.", illustration: `The whole family taking a fond last look at their beloved island tree house from the ship's deck, bittersweet and warm, ${STYLE}` },
      { story: "And so MAIN_CHARACTER sailed home full of stories, having learned that a loving family can build a home anywhere at all.", illustration: `MAIN_CHARACTER and family together at the ship's rail sailing over calm seas at sunset, hopeful heartfelt finale, ${STYLE}` },
    ],
  },

  {
    id: "t15-rebecca-of-sunnybrook-farm",
    tags: ["Classic", "Kindness", "Uplifting"],
    pageCharacters: [
      ["mr cobb"], ["aunt miranda", "aunt jane"], ["aunt miranda"], ["aunt jane"], [], ["mr cobb"], [], ["aunt jane"],
      [], ["aunt miranda"], [], ["aunt jane"], ["aunt miranda", "aunt jane"], [],
    ],
    pages: [
      { story: "MAIN_CHARACTER was a bright, talkative child from Sunnybrook Farm, sent to live with two strict aunts in a fine brick house.", illustration: `MAIN_CHARACTER as a lively child riding a stagecoach through pretty countryside with a small trunk, bright and chatty, ${STYLE}` },
      { story: "The kindly stagecoach driver, Mr Cobb, chuckled all the way at MAIN_CHARACTER's endless happy chatter and big imagination.", illustration: `A jolly older stagecoach driver, Mr Cobb, laughing warmly with MAIN_CHARACTER on the front seat of a horse-drawn coach, ${STYLE}` },
      { story: "At the brick house waited stern Aunt Miranda and gentle Aunt Jane, who hardly knew what to make of such a spirited child.", illustration: `A stern proper aunt and a gentle kind aunt greeting MAIN_CHARACTER at the door of a fine old brick house, formal but curious, ${STYLE}` },
      { story: "Aunt Miranda thought MAIN_CHARACTER far too lively, but soft-hearted Aunt Jane secretly adored the child's sunny ways.", illustration: `Gentle Aunt Jane smiling fondly at MAIN_CHARACTER over sewing by a window while stern Aunt Miranda frowns nearby, ${STYLE}` },
      { story: "MAIN_CHARACTER filled the quiet house with songs and stories, and slowly its dusty corners seemed to brighten.", illustration: `MAIN_CHARACTER cheerfully singing and arranging wildflowers in a formerly gloomy parlour, sunlight breaking in, uplifting, ${STYLE}` },
      { story: "In the little town MAIN_CHARACTER made many friends, even helping sell soap to win a lamp for a poor neighbour family.", illustration: `MAIN_CHARACTER brightly selling soap door to door in a small town, charming the neighbours, cheerful and determined, ${STYLE}` },
      { story: "At school MAIN_CHARACTER dreamed of writing and reciting, and everyone marvelled at such a clever, warm-hearted pupil.", illustration: `MAIN_CHARACTER reciting proudly before a one-room schoolhouse class, other children admiring, warm and bright, ${STYLE}` },
      { story: "When MAIN_CHARACTER fell ill one winter, gentle Aunt Jane sat up nursing the child, and found her own heart grown tender.", illustration: `Gentle Aunt Jane tenderly caring for a poorly MAIN_CHARACTER tucked in bed, soft lamplight, warm and caring, ${STYLE}` },
      { story: "As MAIN_CHARACTER grew, so did the love in that quiet house, until laughter finally lived there for good.", illustration: `MAIN_CHARACTER a little older, laughing with the aunts over tea in a now-cosy bright parlour, family warmth, ${STYLE}` },
      { story: "Even stern Aunt Miranda, though she seldom smiled, grew proud of the bright child who had changed her lonely home.", illustration: `Stern Aunt Miranda watching MAIN_CHARACTER from a doorway with the faintest proud, softening smile, warm interior, ${STYLE}` },
      { story: "MAIN_CHARACTER studied hard and dreamed big, determined to make Sunnybrook Farm and the aunts ever so proud.", illustration: `MAIN_CHARACTER studying eagerly by a window with books and papers, sunlight and ambition, hopeful, ${STYLE}` },
      { story: "When sadness came and the aunts needed help, MAIN_CHARACTER was there — grown kind and strong and dependable.", illustration: `MAIN_CHARACTER comforting gentle Aunt Jane with a warm embrace in the parlour, mature and tender, soft light, ${STYLE}` },
      { story: "The aunts saw at last what a treasure MAIN_CHARACTER had always been, and the brick house was full of love.", illustration: `Both aunts embracing MAIN_CHARACTER warmly in a bright happy parlour, reconciled and loving, golden light, ${STYLE}` },
      { story: "And MAIN_CHARACTER grew up glad and good, having filled a stern old house — and a whole town — with sunshine.", illustration: `MAIN_CHARACTER standing happily before the fine brick house now wreathed in flowers and sunshine, joyful uplifting finale, ${STYLE}` },
    ],
  },

  {
    id: "t18-aesops-fables",
    tags: ["Fables", "Wisdom", "Classic"],
    pageCharacters: [
      ["tortoise", "hare"], ["tortoise", "hare"], ["lion", "mouse"], ["lion", "mouse"],
      ["fox", "crow"], ["fox", "crow"], ["ant", "grasshopper"], ["ant", "grasshopper"], [], [],
    ],
    pages: [
      { story: "MAIN_CHARACTER loved wise old stories, and first watched a boastful Hare laugh at a slow Tortoise and challenge him to a race.", illustration: `MAIN_CHARACTER watching a boastful hare teasing a calm slow tortoise at the start of a countryside race, sunny meadow, ${STYLE}` },
      { story: "The Hare dashed ahead and napped, but the steady Tortoise plodded on and won — and MAIN_CHARACTER learned: slow and steady wins the race.", illustration: `The tortoise crossing a finish line as the hare wakes in surprise, MAIN_CHARACTER cheering, lesson learned, ${STYLE}` },
      { story: "Next MAIN_CHARACTER saw a tiny Mouse spare a great Lion's paw — and the mighty Lion kindly let the little creature go free.", illustration: `MAIN_CHARACTER watching a tiny mouse standing before a huge gentle lion who lets it go, forest clearing, tender, ${STYLE}` },
      { story: "Later the Lion was caught in a net, and the little Mouse gnawed him loose — so MAIN_CHARACTER learned that kindness is never wasted.", illustration: `The little mouse gnawing through ropes to free the trapped lion, MAIN_CHARACTER smiling, gratitude and kindness, ${STYLE}` },
      { story: "Then MAIN_CHARACTER spied a sly Fox flattering a Crow who held a fine piece of cheese in her beak up in a tree.", illustration: `A sly fox looking up and flattering a proud crow perched with cheese in a leafy tree, MAIN_CHARACTER watching, ${STYLE}` },
      { story: "The Crow sang to show off, dropped the cheese, and the Fox snatched it — and MAIN_CHARACTER learned not to trust false flattery.", illustration: `The crow opening its beak to sing as the cheese falls to the grinning fox below, MAIN_CHARACTER wide-eyed, humorous lesson, ${STYLE}` },
      { story: "Next MAIN_CHARACTER watched a busy Ant store food all summer while a merry Grasshopper only fiddled and played.", illustration: `MAIN_CHARACTER watching a hardworking ant carrying grain while a carefree grasshopper plays a fiddle in a sunny summer field, ${STYLE}` },
      { story: "When cold winter came, the Ant was warm and fed, and MAIN_CHARACTER learned it is wise to work as well as play.", illustration: `The cozy ant sharing food with the shivering grasshopper in a warm burrow in winter, MAIN_CHARACTER nodding, kindly lesson, ${STYLE}` },
      { story: "MAIN_CHARACTER gathered all these little lessons like precious treasures to carry through life.", illustration: `MAIN_CHARACTER sitting happily under a big tree with a book, imagining the friendly fable animals around them, warm and thoughtful, ${STYLE}` },
      { story: "And so, wiser and kinder, MAIN_CHARACTER skipped home, glad that even the smallest creatures have the greatest things to teach.", illustration: `MAIN_CHARACTER skipping home down a sunny country lane at golden hour, the fable animals waving farewell, joyful finale, ${STYLE}` },
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
