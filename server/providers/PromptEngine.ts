/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IllustrationStyle } from "../../src/types.js";

export class PromptEngine {
  /**
   * Generates a prompt for creating an official children's storybook character sheet.
   */
  public generateCharacterPrompt(name: string, age: number, gender: string, description: string): string {
    return `Create a comprehensive character design reference sheet for a ${age}-year-old ${gender} named "${name}", in the style of a professional animation/game character model sheet, on a single clean neutral background.
Character description and personality: ${description}

The sheet must be a single image laid out in clearly labeled sections, all showing the exact same character with perfectly consistent face, hairstyle, hair color, eye color, skin tone, and clothing/costume colors throughout every section:

1. TITLE HEADER: The character's name "${name}" displayed prominently at the top like a title card.
2. PROPORTION SETTINGS: A height-comparison chart showing the character at a labeled total height with a head-to-body ratio guide (e.g., "X heads tall"), including a measurement/grid guideline in the background.
3. THREE-VIEW DRAWING: Front view, side view, and back view of the character standing in a neutral pose, evenly spaced and clearly labeled "FRONT VIEW", "SIDE VIEW", "BACK VIEW".
4. EXPRESSION SHEET: A grid of at least 6 labeled facial expressions/headshots (e.g., neutral, happy, wide-eyed wonder, focused, mischievous grin, yawning, serious) showing emotional range.
5. POSE SHEET: A sequence of at least 4 labeled dynamic action poses relevant to the character's personality and story role, shown as clean line-art or lightly colored sketches with numbered steps.
6. COSTUME DESIGN & DETAILS: Close-up callouts of the character's outfit pieces and accessories with small detail insets (zippers, patterns, badges, or props) and labels for each garment/accessory.

Style constraints: Clean, highly polished, professional character-design-sheet style with defined outlines, vibrant but harmonious colors, clear section labels/headers in a legible font, and a well-organized grid layout (similar to official animation studio model sheets). Keep the character simple and charming enough to be easily replicated consistently across a children's storybook.`;
  }

  /**
   * Generates a prompt for generating a structured story JSON.
   */
  public generateStoryPrompt(templateTitle: string, templatePrompt: string, style: IllustrationStyle, childName: string, numPages: number = 8): string {
    return `Generate a complete, highly engaging children's story based on the template theme "${templateTitle}".
Theme and Plot guideline: ${templatePrompt}
Visual Illustration Style: ${style}
Number of pages requested: ${numPages}

CRITICAL PLOT & SYSTEM CONSTRAINTS:
1. Use the EXACT placeholder "MAIN_CHARACTER" in the text instead of the child's actual name. Do not write "${childName}" anywhere in the storyText. Write "MAIN_CHARACTER".
2. The narrative must flow smoothly from page 1 to page ${numPages}, establishing a charming opening, an exciting rising action, a heartwarming climax, and a comforting resolution suitable for a child's bedtime or daytime reading.
3. Every page must have a rich, descriptive and actionable "illustrationPrompt" specifying exactly what's happening in the scene.
4. Each page should have 2-4 sentences of simple, beautiful story text.

You MUST return the output as a valid, parsable JSON object matching this exact schema:
{
  "title": "A highly creative, magical storybook title",
  "coverTitle": "An engaging, short cover subtitle or alternative front title",
  "pages": [
    {
      "pageNumber": 1,
      "storyText": "MAIN_CHARACTER was sitting under the big oak tree...",
      "illustrationPrompt": "MAIN_CHARACTER sitting under a massive, glowing golden oak tree, holding a tiny, glittering compass, looking up at the whispering green leaves in awe."
    }
    // Repeat for all ${numPages} pages
  ]
}

Ensure the output is ONLY valid JSON, with NO surrounding Markdown backticks or chat dialogue outside the JSON.`;
  }

  /**
   * Generates a prompt for individual page illustrations, emphasizing character consistency using the character sheet.
   */
  public generateIllustrationPrompt(
    pageNumber: number,
    scenePrompt: string,
    style: IllustrationStyle,
    characterName: string,
    characterDescription: string,
    characterSheetDescription: string
  ): string {
    return `Create a high-quality illustration in "${style}" style for page ${pageNumber} of a children's book.

CRITICAL INSTRUCTION FOR CHARACTER CONSISTENCY:
You MUST base the main character on the approved character reference sheet described below:
- Character Name: ${characterName}
- Appearance/Features: ${characterDescription}
- Approved Reference Sheet Pose Details: ${characterSheetDescription}

Maintain absolute character consistency! The main character must have the exact same face, same eye color, same hairstyle (color and cut), same clothing colors, and same bodily proportions across this entire book. Never redesign the child.

Scene to illustrate:
${scenePrompt}

Visual Style guidelines:
- Style: ${style}
- Lighting: Charming, cinematic, soft lighting matching the scene mood
- Background: Highly detailed, beautiful background of the scene (no white background here; illustrate the full scenery)
- Composition: Dynamic, wide angle, perfectly framing the main character in action while making sure they are clearly visible and match the pose/action in the text.`;
  }
}
export const promptEngine = new PromptEngine();
