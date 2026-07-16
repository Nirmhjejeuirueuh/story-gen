/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * The placeholder token authored/AI story text uses in place of the hero's name.
 * Illustration prompts use the same token so text and art stay in sync.
 */
export const MAIN_CHARACTER_TOKEN = "MAIN_CHARACTER";

/**
 * Replaces the MAIN_CHARACTER placeholder in story text with the reader's actual
 * name so the narrative reads personally. Safe to call on already-personalized or
 * empty text (no placeholder → returned unchanged).
 */
export function personalizeStoryText(text: string | undefined, childName: string | undefined): string {
  if (!text) return "";
  if (!childName) return text;
  return text.replace(new RegExp(MAIN_CHARACTER_TOKEN, "g"), childName);
}
