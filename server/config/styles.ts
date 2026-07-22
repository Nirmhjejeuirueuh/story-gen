/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * The Story Library's art style catalogue. Every character sheet, cast reference image, and
 * page illustration is rendered in one of these styles. "vintage-watercolor" is the original
 * house style — all art generated before this catalogue existed lives under that id, so nothing
 * has to be regenerated or moved for it to keep working.
 */
export interface ArtStyle {
  id: string;
  label: string;
  /** Dropped verbatim into image-generation prompts as the "rendered in this exact art style" fragment. */
  promptFragment: string;
  /**
   * Names the specific rendering technique/medium this style must NOT come out looking like.
   * Reference-conditioned generation (a photo/illustration passed in as an image input) tends to
   * copy the REFERENCE's own texture, linework and color grading regardless of what the text
   * prompt asks for — especially when the target style is, like the reference, a painted/2D look
   * (Ghibli got swallowed by the vintage-watercolor reference almost entirely before this field
   * existed). Naming the exact medium to avoid gives the model something concrete to reject,
   * rather than a vague "look different" instruction it can quietly ignore.
   */
  avoidFragment: string;
}

export const ART_STYLES: ArtStyle[] = [
  {
    id: "vintage-watercolor",
    label: "Vintage Watercolor",
    promptFragment:
      "whimsical watercolor storybook illustration, soft pastel palette, gentle warm light, delicate ink linework, cohesive vintage children's book style",
    avoidFragment: "a glossy 3D-rendered CGI character or a sculpted clay/plasticine figure",
  },
  {
    id: "pixar-3d",
    label: "Pixar-Inspired 3D",
    promptFragment:
      "Pixar-inspired 3D animated storybook illustration, polished CGI rendering, soft global illumination, expressive rounded character design, vibrant warm color palette, subtle depth of field",
    avoidFragment: "a flat 2D painting, a watercolor wash, or a hand-inked illustration — it must read as a fully rendered 3D CGI character model with real volumetric shading and depth, the way a modern animated feature-film character looks, not a picture of one",
  },
  {
    id: "claymation",
    label: "Claymation",
    promptFragment:
      "stop-motion claymation storybook illustration, handcrafted clay characters with visible fingerprints and sculpting tool marks, soft studio lighting, warm felt and clay textures, whimsical handmade charm",
    avoidFragment: "a 2D painted illustration or a smooth CGI render — it must read as an actual physical clay/plasticine sculpture photographed under studio lighting, with visible fingerprint texture, sculpting seams, and imperfect handmade surfaces",
  },
  {
    id: "ghibli-fantasy",
    label: "Studio Ghibli-Inspired Fantasy",
    promptFragment:
      "Studio Ghibli anime-style character illustration, bold clean confident ink outlines, flat cel-shaded coloring with soft directional shading, large expressive round anime eyes with bright catchlight highlights, warm circular rosy cheek blush, smooth simple flat color fills, soft warm flat background with a gentle color gradient and no visible paper grain or wet-paint texture, crisp clean character silhouette, gentle nostalgic Ghibli-film color palette",
    avoidFragment: "a soft blended watercolor painting with visible paper texture, bleeding wet-paint edges, muted hazy brushwork, or delicate faded ink linework — it must have bold, crisp, confident outlines and flat cel-shaded color fills like a hand-drawn anime cel, with sharp clean edges everywhere, never soft diffused ones",
  },
];

export const DEFAULT_STYLE_ID = "vintage-watercolor";

/** Resolves a style id to its ArtStyle, falling back to the default style for unknown/missing ids. */
export function getStyle(styleId?: string | null): ArtStyle {
  return ART_STYLES.find((s) => s.id === styleId) ?? ART_STYLES.find((s) => s.id === DEFAULT_STYLE_ID)!;
}
