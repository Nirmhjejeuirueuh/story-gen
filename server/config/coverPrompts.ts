/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * A hand-written, iconic FRONT-COVER scene for each Story Library story. This is the "cover prompt"
 * per story: a single vivid description of the cover illustration — the hero as the focal subject
 * plus the story's signature setting, props and mood. It's fed to PromptEngine.buildCoverImagePrompt
 * as the scene/mood hint so the cover composes the RIGHT, recognizable scene for that story, instead
 * of the model guessing from a random interior page (page 1 might be a quiet opening, not a cover-
 * worthy moment). The story's art STYLE is applied on top separately (styles.ts), so the same scene
 * renders distinctly per style.
 *
 * Scenes deliberately say "the hero" / "the young hero" rather than a name — the protagonist's name
 * is carried by the (personalized) title, and a personalized book swaps the hero for the child, so
 * the scene text must not hard-code a specific character's name. Safety mirrors the page pipeline:
 * never a lone child in danger — always a companion or a safe, inviting framing.
 */
export const STORY_COVER_SCENES: Record<string, string> = {
  "t1-alices-adventures-in-wonderland":
    "The young hero peers with wide-eyed wonder into a whimsical Wonderland — an oversized mushroom, a pocket-watch on a vine, a grinning cat's smile among curling flowers, under a dreamy pastel sky.",
  "t2-the-starlight-lantern":
    "The young hero holds a softly glowing lantern aloft on a gentle hilltop at night, warm light spilling upward into a sky full of twinkling stars and drifting clouds.",
  "t3-jack-and-the-beanstalk":
    "The young hero gazes up in awe at the foot of a colossal magic beanstalk that spirals high into fluffy clouds, broad green leaves unfurling, a cosy little cottage and a few golden coins nearby.",
  "t4-the-secret-garden":
    "The young hero pushes open an ivy-covered wooden door into a lush, secret walled garden bursting with blossoms and butterflies, a friendly robin perched on a branch.",
  "t5-the-velveteen-rabbit":
    "The young hero tenderly cradles a soft, well-loved toy rabbit in a cosy nursery bathed in warm lamplight, a few wooden toys scattered nearby.",
  "t6-little-women":
    "The young hero sits happily by a glowing fireside with a warm family gathered close, an open book and a basket of needlework nearby in a cosy candlelit parlour.",
  "t7-treasure-island":
    "The young hero stands boldly on the deck of a tall sailing ship, sea breeze in their hair, an old treasure map in hand and a rugged palm-fringed island on the horizon under a golden sky.",
  "t8-a-little-princess":
    "The young hero stands with quiet dignity in a grand attic room warmed by a single candle's glow, a hint of imagined finery and a cosy shawl around them.",
  "t9-swiss-family-robinson":
    "A cheerful shipwrecked family stands together before their remarkable treehouse home on a lush tropical island, palm trees swaying and friendly animals nearby under a bright sky.",
  "t10-the-jungle-book":
    "The young hero stands confidently in a lush green jungle among friendly animal companions — a big gentle bear and a wise panther beside them — with dappled golden sunlight through the leafy canopy.",
  "t11-little-red-riding-hood":
    "The young hero in a bright red hooded cloak walks a sunny woodland path carrying a little basket of treats, light filtering warmly through tall friendly trees.",
  "t12-the-ugly-duckling":
    "A small, endearing grey duckling stands by a calm reed-fringed pond at golden hour, a family of graceful white swans gliding serenely in the background.",
  "t13-thumbelina":
    "The tiny young hero stands atop a giant blossoming flower in a sunlit garden, sparkling dewdrops all around, a friendly swallow and fluttering butterflies nearby.",
  "t14-robinson-crusoe":
    "The young hero stands on a sandy tropical shore beside a clever handmade shelter, palm trees swaying and a distant ship on the calm horizon at warm sunset.",
  "t15-rebecca-of-sunnybrook-farm":
    "The young hero smiles cheerfully on the lane to a warm New England farmhouse, wildflowers and rolling green fields around them under a bright open sky.",
  "t16-the-wind-in-the-willows":
    "Cheerful animal friends — a mole, a water rat, and a jolly toad — enjoy a riverbank picnic together, a little wooden rowing boat moored nearby among swaying willows.",
  "t17-pollyanna":
    "The young hero beams with irrepressible cheer in a sunny small-town garden, light scattering through a prism into little rainbows, a welcoming house behind them.",
  "t18-aesops-fables":
    "A charming gathering of classic fable animals — a clever fox, a steady tortoise, a proud crow and a friendly lion — in a warm pastoral meadow at golden hour.",
  "t19-the-happy-prince":
    "A gilded statue of a kind prince stands tall above a twilight city, a small swallow perched trustingly on his shoulder, warm lights glowing in the streets below.",
  "t20-the-call-of-the-wild":
    "A strong, noble dog stands proudly on a snowy northern trail at dawn, tall pine forests and mountains behind, breath misting in the crisp bright air.",
};

/** The iconic cover scene for a story, or null when none is defined (caller supplies a fallback). */
export function getCoverScene(storyId: string | undefined): string | null {
  return (storyId && STORY_COVER_SCENES[storyId]) || null;
}
