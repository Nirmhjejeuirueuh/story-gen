/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IllustrationStyle } from "../../src/types.js";
import { HOUSE_STYLE } from "../config/config.js";

export class PromptEngine {
  /**
   * Generates a prompt for creating an official children's storybook character sheet.
   * Rendered in the shared HOUSE_STYLE so the hero's reference matches the story pages
   * (a sheet drawn in a different style is a major cause of the hero "drifting" between
   * the approved sheet and the rendered illustrations).
   */
  public generateCharacterPrompt(name: string, age: number, gender: string, description: string): string {
    return `Create a comprehensive character design reference sheet for a ${age}-year-old ${gender} named "${name}", rendered in this exact art style: ${HOUSE_STYLE}. Use a single clean neutral background.
Character description and personality: ${description}

The sheet must be a single image laid out in clearly labeled sections, all showing the exact same character with perfectly consistent face, hairstyle, hair color, eye color, skin tone, and clothing/costume colors throughout every section:

1. TITLE HEADER: The character's name "${name}" displayed prominently at the top like a title card.
2. PROPORTION SETTINGS: A height-comparison chart showing the character at a labeled total height with a head-to-body ratio guide (e.g., "X heads tall"), including a measurement/grid guideline in the background.
3. THREE-VIEW DRAWING: Front view, side view, and back view of the character standing in a neutral pose, evenly spaced and clearly labeled "FRONT VIEW", "SIDE VIEW", "BACK VIEW".
4. EXPRESSION SHEET: A grid of at least 6 labeled facial expressions/headshots (e.g., neutral, happy, wide-eyed wonder, focused, mischievous grin, yawning, serious) showing emotional range.
5. POSE SHEET: A sequence of at least 4 labeled dynamic action poses relevant to the character's personality and story role, shown as clean line-art or lightly colored sketches with numbered steps.
6. COSTUME DESIGN & DETAILS: Close-up callouts of the character's outfit pieces and accessories with small detail insets (zippers, patterns, badges, or props) and labels for each garment/accessory.

Style constraints: Render every section in the house art style above (${HOUSE_STYLE}) with clear labeled sections and a well-organized grid layout. Keep the character simple, charming, and easy to reproduce consistently across a children's storybook.`;
  }

  /**
   * Builds a full multi-view reference sheet prompt for a fixed-cast (Story Library) character,
   * from its existing single-image description. Used on-demand for a richer DISPLAY sheet; the
   * clean single reference image stays the actual generation reference for story pages.
   */
  public generateCastSheetPrompt(name: string, description: string): string {
    return `Create a comprehensive character design reference sheet for the character "${name}", rendered in this exact art style: ${HOUSE_STYLE}. Use a single clean neutral white background, and keep the character perfectly consistent with the provided reference image.
Character description: ${description}

Lay out a single image in clearly labeled sections, all showing the exact same character with perfectly consistent face, colours, and costume throughout:
1. TITLE HEADER: The character's name "${name}" at the top like a title card.
2. THREE-VIEW DRAWING: Front view, side view, and back view in a neutral pose, labeled "FRONT VIEW", "SIDE VIEW", "BACK VIEW".
3. EXPRESSION SHEET: A grid of at least 6 labeled facial expressions showing emotional range.
4. POSE SHEET: At least 4 labeled dynamic action poses relevant to the character.
5. DETAILS: Close-up callouts of the character's key features, outfit, or props with labels.

Style constraints: render every section in the house art style above (${HOUSE_STYLE}), organized as a clean labeled grid.`;
  }

  /**
   * REDESIGN: generates the pages for a Story Library TEMPLATE (not a personalized book).
   * Given the story and its cast, the model writes, for each of `numPages` pages: the narrative
   * story text, a chosen page LAYOUT (by id, from the supplied catalogue), a scene illustration
   * prompt, and which cast characters appear. The story text is later BAKED INTO the page image
   * per the chosen layout, so keep each page's text short enough to render cleanly (1–3 sentences).
   */
  /** Scene-fit guidance for each layout, so the model picks deliberately rather than arbitrarily. */
  private readonly LAYOUT_SCENE_GUIDE: Record<number, string> = {
    1: "big, wide, detail-rich scenes with no reason to crop tightly — group scenes, establishing shots, full-body action.",
    2: "soft, whimsical, dreamlike moments — magical transformations, cosy interiors, scenes with clouds/leaves/curtains/stars to frame the text.",
    3: "scenes with strong movement or momentum — running, chasing, journeys, a sense of travelling from one place to another.",
    4: "calm, formal, portrait-like moments — introducing a character or a place, quiet dialogue, a clear single focal subject.",
    5: "grand panoramic reveals — a big vista, a new world opening up, a scene meant to feel expansive and awe-inspiring.",
    6: "gentle emotional or magical beats — a climax, a quiet realization, a dream sequence, something meant to feel soft and transitional.",
  };

  public generatePagesPrompt(
    storyTitle: string,
    cast: { key: string; name: string }[],
    numPages: number,
    layouts: { layoutId: number; name: string }[]
  ): string {
    const castList = cast.length ? cast.map((c) => `"${c.key}" (${c.name})`).join(", ") : "(no named cast)";
    const layoutList = layouts
      .map((l) => `${l.layoutId} = ${l.name}. Best for: ${this.LAYOUT_SCENE_GUIDE[l.layoutId] ?? "general scenes."}`)
      .join("\n");
    return `You are adapting the classic children's story "${storyTitle}" into a ${numPages}-page picture book. Your two most important jobs are: (1) picking the layout that actually FITS each page's scene, not defaulting to the same one every time, and (2) writing illustration prompts that compose naturally within that layout — the result must look like a professionally designed picture book, not a generic template repeated ${numPages} times.

CAST (use ONLY these character keys in "characterKeys"): ${castList}

Available page LAYOUTS — read each one's composition AND its "Best for" fit before choosing:
${layoutList}

For EACH of the ${numPages} pages, write:
- "storyText": 1–3 short, warm, simple sentences of narrative for that page. This text will be rendered directly on the page, so keep it concise and easy to read.
- "layoutId": pick the id whose "Best for" description genuinely matches this page's scene and mood — vary your choices across the book the way a real illustrator would, rather than repeating one favorite. Consecutive pages should usually differ unless the story genuinely calls for the same composition twice in a row.
- "illustrationPrompt": a rich, specific description of the scene (setting, characters present, action, mood, lighting), composed WITH the chosen layout in mind — e.g. for a diagonal-flow layout, describe movement flowing across the frame; for a panoramic layout, describe a wide establishing view; for a framed/portrait layout, describe one clear focal subject rather than a crowded scene. Do NOT describe text or typography here — only the visual scene.
- "characterKeys": the subset of the cast keys above whose characters appear on this page (may be empty).

The narrative must flow from a charming opening (page 1) through rising action to a comforting resolution (page ${numPages}), staying faithful to the classic story and suitable for young children.

Return ONLY valid, parsable JSON in this exact shape, with no markdown fences or commentary:
{
  "pages": [
    { "pageNumber": 1, "storyText": "...", "layoutId": 1, "illustrationPrompt": "...", "characterKeys": ["..."] }
  ]
}`;
  }

  /**
   * REDESIGN: builds the image prompt for a single template page whose story text is BAKED INTO
   * the image, composed per the chosen layout. This is the deliberate reversal of the earlier
   * "no text in image" approach — the words are now rendered in the illustration.
   */
  /**
   * Shared "finish" directive appended to every page image, on top of whichever of the 6
   * layouts was chosen. Fixes the earlier "basic" look (a plain text box stacked on a plain
   * picture box) by insisting the whole page reads as ONE continuous hand-painted vintage
   * storybook page — full-bleed art, no hard seams, ornamental typography treatment.
   */
  private readonly PROFESSIONAL_FINISH = `Treat the ENTIRE page — text area and illustration area alike — as ONE single continuous hand-painted piece of art, full-bleed to all four edges. Do NOT render the text zone as a separate plain flat white or solid-colour rectangle sitting on top of the picture; the same aged-parchment paper texture, warm lighting, and soft colour palette must run underneath and behind the text exactly as it does through the illustration, so the two areas feel painted on the same page, not pasted together. Add a delicate, understated decorative treatment around the text: a thin hairline or double-rule border (ink or muted gold), and a small ornamental flourish, flourish divider, or a tiny cluster of dots beneath the last line of text. Render the story text in refined, elegant serif or fine calligraphic-style lettering, as if hand-lettered for a beautifully printed antique fairy-tale book. Let the illustration itself bleed all the way to the page edges with a very soft vignette, rather than sitting in a hard-edged box or frame with visible margins. Overall finish: the polished, timeless look of a Golden-Age illustrated children's storybook page — warm, painterly, and cohesive from edge to edge.`;

  public buildTextPageImagePrompt(
    storyText: string,
    illustrationPrompt: string,
    layoutPrompt: string,
    castNames: string[]
  ): string {
    const cast = castNames.length ? castNames.join(", ") : "";
    return `Create ONE finished children's storybook PAGE as a single image, rendered in this exact art style: ${HOUSE_STYLE}.

PAGE LAYOUT — follow this composition precisely for WHERE the text and the scene sit on the page:
${layoutPrompt}

FINISH — how the whole page must look and feel (this is what separates a professional storybook page from a rough draft):
${this.PROFESSIONAL_FINISH}

RENDER THIS EXACT STORY TEXT on the page, inside the layout's reserved text area, generously sized and fully legible. Spell every word EXACTLY as written, with no extra or missing words:
"""
${storyText}
"""

SCENE to illustrate in the illustration area:
${illustrationPrompt}
${cast ? `\nKeep these characters perfectly consistent with the provided reference images — same faces, colours, and costumes: ${cast}.` : ""}

Premium printed picture-book quality. The rendered text MUST be spelled correctly, cleanly kerned, and easy for a child to read. Do not add any other text, captions, page numbers, or watermarks beyond the story text above.`;
  }

  /**
   * Generates a prompt for individual page illustrations, emphasizing character consistency using the character sheet.
   */
  /**
   * Hard constraint appended to every PAGE illustration prompt. The app renders the story
   * text separately as HTML (see BookPreview), so the artwork must contain zero typography.
   * NOTE: intentionally NOT applied to character-sheet prompts, which want labeled sections.
   */
  public readonly NO_TEXT_CONSTRAINT = `ABSOLUTELY NO TEXT IN THE IMAGE: Do not draw, render, or include any letters, words, numbers, captions, titles, labels, speech bubbles, signs, books-with-legible-writing, or written characters of any language anywhere in the illustration. The image must be 100% visual with zero typography — the story text is added separately by the app.`;

  /** Appends the no-text constraint to any page-illustration scene prompt. */
  public withNoText(prompt: string): string {
    return `${prompt}\n\n${this.NO_TEXT_CONSTRAINT}`;
  }

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
- Composition: Dynamic, wide angle, perfectly framing the main character in action while making sure they are clearly visible and match the pose/action in the text.

${this.NO_TEXT_CONSTRAINT}`;
  }
}
export const promptEngine = new PromptEngine();
