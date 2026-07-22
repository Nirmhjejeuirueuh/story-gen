/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ArtStyle, DEFAULT_STYLE_ID, getStyle } from "../config/styles.js";

export class PromptEngine {
  /**
   * Directive appended wherever a reference IMAGE is combined with a non-default style. Without
   * this, the model tends to copy the reference's own rendering technique (its watercolor wash,
   * ink linework, brush texture) over the requested style, especially when the requested style is
   * also a painted/2D look — Ghibli got swallowed by a watercolor reference almost entirely before
   * this existed. Naming the exact medium to avoid (via style.avoidFragment) gives the model
   * something concrete to reject instead of a vague "look different" instruction.
   */
  private styleOverrideDirective(style: ArtStyle): string {
    if (style.id === DEFAULT_STYLE_ID) return "";
    return ` The reference image(s) are for IDENTITY ONLY — face shape, hairstyle, proportions, and costume silhouette. Completely IGNORE and DISCARD the reference's own rendering technique, color palette, brush texture, and shading style; do not let any of it carry over. Render the ENTIRE image from scratch as if a different artist working in a different medium drew it. It must NOT come out looking like ${style.avoidFragment}.`;
  }

  /**
   * Generates a prompt for creating an official children's storybook character sheet.
   * Rendered in the given style so the hero's reference matches the story pages (a sheet
   * drawn in a different style is a major cause of the hero "drifting" between the approved
   * sheet and the rendered illustrations).
   */
  public generateCharacterPrompt(name: string, age: number, gender: string, description: string, style: ArtStyle = getStyle()): string {
    return `Create a comprehensive character design reference sheet for a ${age}-year-old ${gender} named "${name}", rendered in this exact art style: ${style.promptFragment}. Use a single clean neutral background.
Character description and personality: ${description}

The sheet must be a single image laid out in clearly labeled sections, all showing the exact same character with perfectly consistent face, hairstyle, hair color, eye color, skin tone, and clothing/costume colors throughout every section:

1. TITLE HEADER: The character's name "${name}" displayed prominently at the top like a title card.
2. PROPORTION SETTINGS: A height-comparison chart showing the character at a labeled total height with a head-to-body ratio guide (e.g., "X heads tall"), including a measurement/grid guideline in the background.
3. THREE-VIEW DRAWING: Front view, side view, and back view of the character standing in a neutral pose, evenly spaced and clearly labeled "FRONT VIEW", "SIDE VIEW", "BACK VIEW".
4. EXPRESSION SHEET: A grid of at least 6 labeled facial expressions/headshots (e.g., neutral, happy, wide-eyed wonder, focused, mischievous grin, yawning, serious) showing emotional range.
5. POSE SHEET: A sequence of at least 4 labeled dynamic action poses relevant to the character's personality and story role, shown as clean line-art or lightly colored sketches with numbered steps.
6. COSTUME DESIGN & DETAILS: Close-up callouts of the character's outfit pieces and accessories with small detail insets (zippers, patterns, badges, or props) and labels for each garment/accessory.

Style constraints: Render every section in the art style above (${style.promptFragment}) with clear labeled sections and a well-organized grid layout. Keep the character simple, charming, and easy to reproduce consistently across a children's storybook.${this.styleOverrideDirective(style)}`;
  }

  /**
   * Generates a story-library cast member's CLEAN reference image in a new style, conditioned on
   * their existing default-style reference so identity carries over. This is the "seed" step for
   * every non-default style — get this prompt right and every downstream generation (page images,
   * display sheets) that conditions on THIS image inherits the correct style automatically.
   */
  public generateStyledCastReferencePrompt(description: string, style: ArtStyle): string {
    return `Full-body character reference of ${description}. A single character standing in a clear neutral pose, facing forward, centered on a plain soft pastel background, friendly and appealing children's book character, rendered in this exact art style: ${style.promptFragment}. Keep the same face, proportions, and costume as the provided reference image — only the rendering style should change.${this.styleOverrideDirective(style)}`;
  }

  /**
   * Builds a full multi-view reference sheet prompt for a fixed-cast (Story Library) character,
   * from its existing single-image description. Used on-demand for a richer DISPLAY sheet; the
   * clean single reference image stays the actual generation reference for story pages.
   */
  public generateCastSheetPrompt(name: string, description: string, style: ArtStyle = getStyle()): string {
    return `Create a comprehensive character design reference sheet for the character "${name}", rendered in this exact art style: ${style.promptFragment}. Use a single clean neutral white background, and keep the character perfectly consistent with the provided reference image.
Character description: ${description}

Lay out a single image in clearly labeled sections, all showing the exact same character with perfectly consistent face, colours, and costume throughout:
1. TITLE HEADER: The character's name "${name}" at the top like a title card.
2. THREE-VIEW DRAWING: Front view, side view, and back view in a neutral pose, labeled "FRONT VIEW", "SIDE VIEW", "BACK VIEW".
3. EXPRESSION SHEET: A grid of at least 6 labeled facial expressions showing emotional range.
4. POSE SHEET: At least 4 labeled dynamic action poses relevant to the character.
5. DETAILS: Close-up callouts of the character's key features, outfit, or props with labels.

Style constraints: render every section in the art style above (${style.promptFragment}), organized as a clean labeled grid.${this.styleOverrideDirective(style)}`;
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
    7: "quiet scene-break or mood beats meant to be experienced wordlessly — right after a big reveal, an emotional climax, or a magical transition, where letting the picture breathe alone is more powerful than more text.",
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
- "storyText": 1–3 short, warm, simple sentences of narrative for that page. This text will be rendered directly on the page, so keep it concise and easy to read. EXCEPTION: pages using layout 7 (see below) must have "storyText": "" (empty) — that layout is wordless.
- "layoutId": pick the id whose "Best for" description genuinely matches this page's scene and mood — vary your choices across the book the way a real illustrator would, rather than repeating one favorite. Consecutive pages should usually differ unless the story genuinely calls for the same composition twice in a row. Layout 7 (wordless full illustration) should appear roughly once every 6-8 pages — never twice in a row — and only right after a natural pause in the story (a big reveal, an emotional beat, a turning point). Whatever plot detail that wordless page would have carried must be folded into the NEXT page's storyText instead, so the narrative never has a gap or feels broken.
- "illustrationPrompt": a rich, specific description of the scene (setting, characters present, action, mood, lighting), composed WITH the chosen layout in mind — e.g. for a diagonal-flow layout, describe movement flowing across the frame; for a panoramic layout, describe a wide establishing view; for a framed/portrait layout, describe one clear focal subject rather than a crowded scene. Do NOT describe text or typography here — only the visual scene.
- "characterKeys": the subset of the cast keys above whose characters appear on this page (may be empty).

SAFETY (must follow on every page): never describe a young child or baby completely alone in an isolated, dangerous-looking, or unsupervised scene — no lone infant in open wilderness, no child alone handling fire or a weapon, no child alone at a dangerous height or edge. Always include a companion in frame (another cast member, a parental figure, or a protective animal), or reframe the scene to preserve the story beat without the risky framing. This applies even when the scene description feels true to the classic story.

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
   * layouts was chosen. The illustration now fills the whole page edge to edge (no reserved
   * parchment/text zone) — the story text is layered directly on top of the artwork using a
   * soft scrim for legibility, like a real picture-book spread rather than a text box on a page.
   * The structural rules (full-bleed, no borders, the soft text glow) apply to every style; only
   * the closing "overall finish" sentence names the specific art style being rendered.
   */
  private buildFinish(style: ArtStyle): string {
    return `The illustration must fill the ENTIRE page edge to edge — full-bleed art covering every pixel, with absolutely no plain background, parchment strip, or empty margin showing anywhere, including directly behind the text. Do NOT add any border, frame, rule line, or corner ornamentation anywhere on the page. Where the story text sits (per the layout instructions above), lay it directly over the artwork using only a soft, irregular cloud-like glow behind the letters that fades unevenly in every direction, like a gentle wash of mist or soft light — just enough to keep the words clearly legible against the scene beneath. This glow must NEVER read as a rectangle, band, panel, or box of any shape, and must have NO visible straight edge, hard boundary, or outline anywhere — if you can trace a line around where it "stops", it is wrong; it should be impossible to say exactly where the glow ends and the illustration resumes. Never use a solid-coloured or parchment-toned panel behind the text; the illustration must stay visible through the glow. Beneath the text, add one small understated decorative flourish or divider (a thin hairline rule, a tiny ornamental swirl, or a cluster of dots) — the only ornamental element allowed on the page. Render the story text in refined, elegant lettering using a text colour that reads clearly and harmonizes with the illustration's palette (avoid harsh pure black). Overall finish: one continuous, full-bleed illustration rendered in this exact style: ${style.promptFragment}, with the text gently layered directly on top — never a picture that leaves empty space, a plain background, or any hard-edged shape showing anywhere on the page.`;
  }

  public buildTextPageImagePrompt(
    storyText: string,
    illustrationPrompt: string,
    layoutPrompt: string,
    castNames: string[],
    style: ArtStyle = getStyle()
  ): string {
    const cast = castNames.length ? castNames.join(", ") : "";
    const hasText = storyText.trim().length > 0;
    return `Create ONE finished children's storybook PAGE as a single image, rendered in this exact art style: ${style.promptFragment}.

PAGE LAYOUT — follow this composition precisely for WHERE the ${hasText ? "text and the scene sit" : "scene fills the page"}:
${layoutPrompt}

FINISH — how the whole page must look and feel (this is what separates a professional storybook page from a rough draft):
${this.buildFinish(style)}

${hasText ? `RENDER THIS EXACT STORY TEXT on the page, inside the layout's reserved text area, generously sized and fully legible. Spell every word EXACTLY as written, with no extra or missing words:
"""
${storyText}
"""` : `This is a WORDLESS page — render NO text, letters, or typography anywhere on the page. The full canvas is the illustration.`}

SCENE to illustrate in the illustration area:
${illustrationPrompt}
${cast ? `\nKeep these characters' IDENTITY perfectly consistent with the provided reference images — same faces, proportions, and costumes: ${cast}. The whole page, including these characters, must still be rendered in the art style specified above — do not let the reference images' own rendering technique override it.` : ""}

Premium printed picture-book quality.${hasText ? " The rendered text MUST be spelled correctly, cleanly kerned, and easy for a child to read." : ""} Do not add any other text, captions, page numbers, or watermarks${hasText ? " beyond the story text above" : ""}.`;
  }

}
export const promptEngine = new PromptEngine();
