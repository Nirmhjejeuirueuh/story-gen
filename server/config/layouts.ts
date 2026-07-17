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
      "Create a traditional children's storybook page layout. Reserve the top 30–35% of the page for story text with a soft cream parchment background. Place the text in a clean centered block with generous margins. The illustration should occupy the lower 65–70% of the page, showing the full scene with depth and detail. Keep all important characters and emotional expressions below the text area. Use elegant serif typography, dark brown text, balanced line spacing, and a premium printed picture book appearance. Make the text and illustration blend naturally like a classic vintage storybook.",
  },
  {
    layoutId: 2,
    name: "Floating Text Panel with Illustration Surrounding",
    prompt:
      "Create a storybook page layout with a soft floating cream parchment text panel placed in the upper center area, covering approximately 30% of the page. Allow the illustration to gently flow around the edges of the text panel with decorative elements such as soft clouds, curtains, leaves, stars, or room details extending toward the text area. Keep main characters positioned in the lower portion of the page. Use elegant serif typography, dark brown text, wide margins, and a handcrafted watercolor picture book style.",
  },
  {
    layoutId: 3,
    name: "Top Left Text + Diagonal Illustration Flow",
    prompt:
      "Design a dynamic children's storybook page. Reserve the upper left 30–35% area for text on a warm cream parchment background. Let the illustration flow diagonally from the lower left toward the upper right, creating a sense of movement and depth. Keep characters grouped in the lower section while decorative background elements gently connect with the text area. Use professional book typography, dark brown serif font, soft watercolor textures, and balanced negative space.",
  },
  {
    layoutId: 4,
    name: "Full Width Header Text + Framed Illustration",
    prompt:
      "Create a premium picture book page with a full-width text section across the top 30% of the page. Use a subtle cream paper texture behind the text. Below the text area, create a beautifully framed illustration with soft watercolor edges blending into the page background. Keep the main characters inside the illustration frame and clearly visible. Use elegant children's book serif typography, large readable text, generous margins, and a refined vintage publishing style.",
  },
  {
    layoutId: 5,
    name: "Side Text Column + Large Scene Illustration",
    prompt:
      "Create a children's storybook layout with a vertical text column occupying approximately 30–35% of the page on the left side. Use a cream parchment background for the text area. Place the main illustration on the right side, filling the remaining space with a detailed watercolor scene. Keep characters away from the text column. Use elegant serif typography, dark brown text, balanced spacing, and a professional picture book composition with strong visual storytelling.",
  },
  {
    layoutId: 6,
    name: "Decorative Top Text with Curved Illustration Transition",
    prompt:
      "Create a magical children's storybook page layout. Reserve the upper 30–35% for story text inside a softly curved cream parchment area. The bottom illustration should transition upward with organic watercolor shapes, gentle clouds, curtains, or decorative elements blending into the text area. Keep the characters fully visible in the lower section. Use vintage watercolor illustration style, elegant serif typography, dark brown lettering, generous margins, and a seamless premium picture book design.",
  },
];

/** Lookup a layout by id, falling back to the classic top-text layout (1). */
export function getLayoutById(layoutId: number | null | undefined): PageLayout {
  return PAGE_LAYOUTS.find((l) => l.layoutId === layoutId) ?? PAGE_LAYOUTS[0];
}
