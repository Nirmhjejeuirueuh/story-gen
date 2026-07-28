/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * The FRONT-COVER heading for each Story Library story. Every story has a `default` heading that
 * always includes the story's name; a story that reads naturally with the child's name in it also
 * gets a `personalized` template (with a `{name}` placeholder).
 *
 * Why this exists instead of a blind name-swap: the cover used to run the story title through
 * personalizeStoryText, which replaces the protagonist's name with the child's. For a title that
 * IS just the protagonist's name (e.g. "Thumbelina", "Pollyanna") that erased the story entirely —
 * the cover for Emma's Thumbelina simply read "Emma". And swapping "Jack" → "Erik" inside
 * "Jack and the Beanstalk" produced odd input the image model then garbled. So headings are now
 * authored per story: personalize ONLY where it still reads as that story (possessive titles, or
 * "{name} and the …" object stories), and fall back to the plain default everywhere else.
 */
interface CoverTitle {
  /** Always shown when there's no personalization (or no child). Includes the story name. */
  default: string;
  /** Optional personalized heading with a `{name}` placeholder; omitted when it can't read naturally. */
  personalized?: string;
}

export const STORY_COVER_TITLES: Record<string, CoverTitle> = {
  "t1-alices-adventures-in-wonderland": { default: "Alice's Adventures in Wonderland", personalized: "{name}'s Adventures in Wonderland" },
  "t2-the-starlight-lantern": { default: "The Starlight Lantern", personalized: "{name} and the Starlight Lantern" },
  "t3-jack-and-the-beanstalk": { default: "Jack and the Beanstalk", personalized: "{name} and the Beanstalk" },
  "t4-the-secret-garden": { default: "The Secret Garden", personalized: "{name} and the Secret Garden" },
  "t5-the-velveteen-rabbit": { default: "The Velveteen Rabbit", personalized: "{name} and the Velveteen Rabbit" },
  "t6-little-women": { default: "Little Women" },
  "t7-treasure-island": { default: "Treasure Island", personalized: "{name} and Treasure Island" },
  "t8-a-little-princess": { default: "A Little Princess", personalized: "{name}, the Little Princess" },
  "t9-swiss-family-robinson": { default: "Swiss Family Robinson" },
  "t10-the-jungle-book": { default: "The Jungle Book", personalized: "{name} and the Jungle Book" },
  "t11-little-red-riding-hood": { default: "Little Red Riding Hood" },
  "t12-the-ugly-duckling": { default: "The Ugly Duckling", personalized: "{name} and the Ugly Duckling" },
  "t13-thumbelina": { default: "Thumbelina" },
  "t14-robinson-crusoe": { default: "Robinson Crusoe" },
  "t15-rebecca-of-sunnybrook-farm": { default: "Rebecca of Sunnybrook Farm", personalized: "{name} of Sunnybrook Farm" },
  "t16-the-wind-in-the-willows": { default: "The Wind in the Willows" },
  "t17-pollyanna": { default: "Pollyanna" },
  "t18-aesops-fables": { default: "Aesop's Fables" },
  "t19-the-happy-prince": { default: "The Happy Prince" },
  "t20-the-call-of-the-wild": { default: "The Call of the Wild", personalized: "{name} and the Call of the Wild" },
};

/**
 * The cover heading for a story: the `personalized` template filled with the child's name when one
 * exists AND the story defines a personalized form; otherwise the story's default heading (falling
 * back to `fallbackTitle` — the raw story title — for a story not listed above).
 */
export function getCoverTitle(storyId: string | undefined, childName: string | null | undefined, fallbackTitle: string): string {
  const entry = storyId ? STORY_COVER_TITLES[storyId] : undefined;
  const name = (childName || "").trim();
  if (name && entry?.personalized) {
    return entry.personalized.replace(/\{name\}/g, name);
  }
  return entry?.default || fallbackTitle;
}
