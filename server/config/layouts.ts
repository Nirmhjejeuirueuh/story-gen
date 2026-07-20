/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * LayoutPlan — the fixed catalogue of page layouts the image generator composes to.
 *
 * Under the redesign, each story page's illustration is generated WITH its story text baked
 * directly into the image, composed according to ONE of these layouts. The layout is chosen
 * per page during page generation (the text-generation step picks the best fit for the scene),
 * and its `prompt` is fed into the image prompt so the model reserves the described text area
 * and renders the words there.
 *
 * Seeded into the Firestore `layoutPlans` collection (see LayoutPlanStore). A story template
 * references the active plan via `StoryTemplateDoc.layoutPlanId`; a generated page records the
 * chosen layout via `TemplatePageDoc.layoutId`.
 */
export interface PageLayout {
  layoutId: number;
  name: string;
  prompt: string;
}

/** The single default plan id (one plan of 6 layouts for now; the schema allows more later). */
export const DEFAULT_LAYOUT_PLAN_ID = "default";

export const PAGE_LAYOUTS: PageLayout[] = [
  {
    layoutId: 1,
    name: "Classic Top Text + Full Illustration Bottom",
    prompt:
      "The illustration must fill the ENTIRE page edge to edge, including the area behind the text — there is no plain background strip anywhere. Compose the scene so the top 30% is naturally calmer there (open sky, foliage, a plain wall, distant background) so text overlaid there stays legible, then overlay the story text near the top directly on top of that part of the artwork, using a soft, irregular cloud-like glow behind the letters that fades unevenly in every direction like mist or soft light — NEVER a rectangle, band, or box, and with no visible straight edge or boundary line anywhere. The rest of the scene, and the characters, occupy the lower two-thirds, fully visible with no border around them. Elegant serif typography, warm dark ink.",
  },
  {
    layoutId: 2,
    name: "Floating Text Panel with Illustration Surrounding",
    prompt:
      "The illustration must fill the ENTIRE page edge to edge with no plain background anywhere. Compose the scene with soft clouds, leaves, curtains, or stars naturally occupying the upper-center area, then overlay the story text directly on top of that part of the artwork using a soft, irregular cloud-like glow behind the letters that fades unevenly in every direction like mist or soft light — NEVER a rectangle, panel, or box, and with no visible straight edge or boundary line anywhere. Keep the main characters clearly visible in the lower portion of the full-bleed scene. Elegant serif typography, warm dark ink, handcrafted watercolor picture-book style.",
  },
  {
    layoutId: 3,
    name: "Top Left Text + Diagonal Illustration Flow",
    prompt:
      "The illustration must fill the ENTIRE page edge to edge with no plain background anywhere, flowing diagonally from the lower-left toward the upper-right for a sense of movement and depth. Overlay the story text directly on the artwork in the upper-left, over whichever part of the scene is naturally calmest there, using a soft, irregular cloud-like glow behind the letters that fades unevenly in every direction like mist or soft light — NEVER a rectangle, band, or box, and with no visible straight edge or boundary line anywhere. Characters and action stay grouped through the diagonal flow. Professional book typography, dark warm ink, soft watercolor textures.",
  },
  {
    layoutId: 4,
    name: "Full Width Header Text + Framed Illustration",
    prompt:
      "The illustration must fill the ENTIRE page edge to edge, including behind the text — no plain background strip anywhere and no illustration frame or box. Compose the top of the scene so it reads calmly (sky, wall, distant background), then overlay the story text near the top directly on top of that part of the artwork, using a soft, irregular cloud-like glow behind the letters that fades unevenly in every direction like mist or soft light — this must NEVER read as a rectangle, band, panel, or box of any kind, and must have NO visible straight edge, hard boundary, or outline anywhere. Keep the main characters clearly visible in the rest of the full-bleed scene. Elegant children's book serif typography, large readable text, refined vintage publishing style.",
  },
  {
    layoutId: 5,
    name: "Side Text Column + Large Scene Illustration",
    prompt:
      "The illustration must fill the ENTIRE page edge to edge with no plain background anywhere. Compose the scene so its left third reads calmly (sky, water, open ground, a plain wall), then overlay the story text there directly on top of the artwork using a soft, irregular cloud-like glow behind the letters that fades unevenly in every direction like mist or soft light — NEVER a rectangle, column, panel, or box, and with no visible straight edge or boundary line anywhere. The main scene and characters fill the rest of the page in full detail. Elegant serif typography, warm dark ink, strong visual storytelling.",
  },
  {
    layoutId: 6,
    name: "Decorative Top Text with Curved Illustration Transition",
    prompt:
      "The illustration must fill the ENTIRE page edge to edge with no plain background anywhere, using organic, curved composition — clouds, foliage, or flowing shapes. Overlay the story text near the top directly on the artwork, over whichever part of the scene naturally reads calmest, using a soft, irregular cloud-like glow behind the letters that fades unevenly in every direction like mist or soft light — NEVER a rectangle, panel, or box (curved or otherwise), and with no visible straight edge or boundary line anywhere. Characters stay fully visible in the rest of the full-bleed scene. Vintage watercolor illustration style, elegant serif typography, warm dark ink.",
  },
  {
    layoutId: 7,
    name: "Full Illustration — No Text",
    prompt:
      "Create a single, full-bleed children's storybook illustration occupying the ENTIRE page from edge to edge — a wordless page meant to be experienced purely through imagery, with NO reserved text area anywhere on the page and NO border or frame of any kind. Render one complete, richly detailed painterly scene using the full canvas as a visual pause in the story. Maintain the same warm watercolor art style as every other page in the book so it still feels like part of the same storybook, but reserve absolutely no space for typography.",
  },
];

/** Lookup a layout by id, falling back to the classic top-text layout (1). */
export function getLayoutById(layoutId: number | null | undefined): PageLayout {
  return PAGE_LAYOUTS.find((l) => l.layoutId === layoutId) ?? PAGE_LAYOUTS[0];
}
