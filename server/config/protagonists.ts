/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Maps each Story Library story to its PROTAGONIST cast key — the single character an uploaded
 * child replaces when they "star" in that story as the hero.
 *
 * Why this exists: the REDESIGN "Generate Pages" pipeline has the text model author each page's
 * storyText and illustrationPrompt using the protagonist's REAL name and appearance baked in
 * (e.g. "…so she was called Thumbelina", "tiny Thumbelina, a sweet girl with blonde hair"), and
 * lists the protagonist in the page's `characterKeys`. There is no MAIN_CHARACTER token to swap.
 * So a personalized book, built from those template pages, would otherwise keep the original
 * protagonist's name, appearance, AND reference image — the child never appears. Knowing the
 * protagonist key lets the personalization path (QueueService.executeImageJob) swap the
 * protagonist's name for the child's and DROP the protagonist's own reference image so the
 * child's photo is the only character reference.
 *
 * Only stories with a single, clear child/lead protagonist are listed. Ensemble stories
 * (Aesop's Fables, Swiss Family Robinson, The Wind in the Willows) and stories with no child
 * lead to personalize into (The Happy Prince) are intentionally omitted — a book made from those
 * simply isn't name/appearance-substituted (its own cast is used as authored).
 */
export const STORY_PROTAGONISTS: Record<string, string> = {
  "t1-alices-adventures-in-wonderland": "alice",
  "t2-the-starlight-lantern": "little cloud",
  "t3-jack-and-the-beanstalk": "jack",
  "t4-the-secret-garden": "mary",
  "t5-the-velveteen-rabbit": "velveteen rabbit",
  "t6-little-women": "jo",
  "t7-treasure-island": "jim",
  "t8-a-little-princess": "sara",
  "t10-the-jungle-book": "mowgli",
  "t11-little-red-riding-hood": "little red riding hood",
  "t12-the-ugly-duckling": "ugly duckling",
  "t13-thumbelina": "thumbelina",
  "t14-robinson-crusoe": "robinson crusoe",
  "t15-rebecca-of-sunnybrook-farm": "rebecca",
  "t17-pollyanna": "pollyanna",
  "t20-the-call-of-the-wild": "buck",
};

/** The protagonist cast key for a story, or null if it has no single designated protagonist. */
export function getProtagonistKey(storyId: string | undefined): string | null {
  return (storyId && STORY_PROTAGONISTS[storyId]) || null;
}

/**
 * The protagonist's DISPLAY name for a story (e.g. "Thumbelina"), resolved from its cast, or null
 * when the story has no designated protagonist / the key isn't in the cast.
 */
export function getProtagonistName(storyId: string | undefined, cast: { key: string; displayName: string }[]): string | null {
  const key = getProtagonistKey(storyId);
  if (!key) return null;
  return cast.find((c) => c.key === key)?.displayName || null;
}

/**
 * Swaps the legacy MAIN_CHARACTER token AND the story protagonist's own name for the child's name.
 * Applied to a personalized book's story text and illustration prompts at CREATION time, so the
 * stored book (what Book Preview, the editor and the PDF all display) features the child — not
 * just the image prompt at render time.
 */
export function personalizeStoryText(text: string, protagonistName: string | null, childName: string): string {
  if (!text) return text;
  let out = text.replace(/MAIN_CHARACTER/g, childName || "MAIN_CHARACTER");
  if (protagonistName && childName) {
    out = out.replace(new RegExp(protagonistName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), childName);
  }
  return out;
}
