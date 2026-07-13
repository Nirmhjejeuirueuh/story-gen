/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IllustrationStyle, StoryTemplate } from "../../src/types.js";

export const PORT = 3000;
export const HOST = "0.0.0.0";

/**
 * The single "house" art style for the whole Story Library — applied to hero character
 * sheets, cast reference images, and every page illustration. Keeping one style across
 * sheets + cast + pages is what makes a story's look cohesive and its characters consistent.
 */
export const HOUSE_STYLE =
  "whimsical watercolor storybook illustration, soft pastel palette, gentle warm light, delicate ink linework, cohesive vintage children's book style";

export const DEFAULT_STYLES = [
  {
    value: IllustrationStyle.PIXAR,
    label: "Pixar Animation Style",
    description: "Vibrant 3D characters, soft cinematic lighting, expressive eyes, and high-fidelity rendering.",
    preview: "🎨 Pixar Style"
  },
  {
    value: IllustrationStyle.DISNEY,
    label: "Classic Disney Style",
    description: "Traditional hand-drawn features, charming expressions, warm pastel-toned color palettes, and soft outlines.",
    preview: "✨ Disney Style"
  },
  {
    value: IllustrationStyle.WATERCOLOR,
    label: "Whimsical Watercolor",
    description: "Dreamy hand-painted textures, soft feathered edges, organic ink strokes, and gentle natural colors.",
    preview: "🖌️ Watercolor Style"
  },
  {
    value: IllustrationStyle.STORYBOOK,
    label: "Vintage Storybook",
    description: "Rich cross-hatched details, classical ink drawings, earthy golden-age colors, and nostalgic feel.",
    preview: "📚 Storybook Style"
  },
  {
    value: IllustrationStyle.CARTOON,
    label: "Modern Cartoon",
    description: "Bold clean line-art, flat colors with simple shading, highly stylized, energetic, and highly readable.",
    preview: "🐱 Cartoon Style"
  },
  {
    value: IllustrationStyle.ANIME,
    label: "Chibi Anime",
    description: "Cute large heads, sparkle-eyes, adorable miniature proportions, energetic emotions, and bright soft shading.",
    preview: "⭐ Anime Style"
  },
  {
    value: IllustrationStyle.DREAMWORKS,
    label: "DreamWorks 3D",
    description: "Adventurous 3D cinematic style, rich scenic depth, playful heroic lighting, and detailed textures.",
    preview: "🏰 DreamWorks Style"
  },
  {
    value: IllustrationStyle.CUTE_3D,
    label: "Cute Claymation / 3D Toy",
    description: "Soft tactile clay textures, rounded toy-like features, soft studio lighting, and friendly designs.",
    preview: "🧸 Cute 3D Style"
  }
];

export const DEFAULT_TEMPLATES: StoryTemplate[] = [
  {
    id: "dino-adventure",
    title: "Dinosaur Adventure",
    coverImage: "🦕",
    description: "Travel back in time to meet a friendly little Brontosaurus who has lost his special sparkling berry, and help him find it!",
    ageRange: "3-6 years",
    numberOfPages: 8,
    promptTemplate: "Create an exciting, heartwarming dinosaur story where MAIN_CHARACTER travels back in time, meets a friendly little dinosaur named Denny, and helps them search the lush prehistoric valleys for a glowing star berry."
  },
  {
    id: "space-adventure",
    title: "Space Adventure",
    coverImage: "🚀",
    description: "Blast off in a cardboard rocket ship to help a stranded star-catcher find their missing starry constellations.",
    ageRange: "4-8 years",
    numberOfPages: 8,
    promptTemplate: "Create a thrilling, imaginative space journey where MAIN_CHARACTER builds a secret spaceship, flies past the moon, and assists a cosmic star-keeper in retrieving lost shiny stellar constellations."
  },
  {
    id: "unicorn-magic",
    title: "Unicorn Magic",
    coverImage: "🦄",
    description: "Enter the Whispering Woods to help Barnaby the Unicorn find his lost golden horn polish before the Rainbow Festival.",
    ageRange: "3-7 years",
    numberOfPages: 8,
    promptTemplate: "Create a magical, enchanting fairytale where MAIN_CHARACTER travels into a glowing candy-colored forest to help a clumsy unicorn named Barnaby restore his magical horn's sparkle before the grand Rainbow festival."
  },
  {
    id: "jungle-safari",
    title: "Jungle Adventure",
    coverImage: "🦁",
    description: "Embark on an interactive safari deep into the Whispering Jungle to learn the secret greeting of the ancient golden lion.",
    ageRange: "4-7 years",
    numberOfPages: 8,
    promptTemplate: "Create a vibrant, educational jungle safari story where MAIN_CHARACTER follows glowing pawprints, meets friendly talking animals like a giggling monkey, and learns the majestic, warm song of the Golden Lion."
  },
  {
    id: "pirate-treasure",
    title: "Pirate Treasure Hunt",
    coverImage: "🏴‍☠️",
    description: "Sail the bathtub seas to Sandy-Shore Island in search of a chest filled with magical glowing seashells.",
    ageRange: "4-9 years",
    numberOfPages: 8,
    promptTemplate: "Create a playful pirate adventure where MAIN_CHARACTER joins a pirate crew led by a polite parrot, decodes a mysterious map, and unearths a chest filled with singing, glowing seashells."
  },
  {
    id: "bedtime-story",
    title: "The Moon's Bedtime Lullaby",
    coverImage: "🌙",
    description: "A calming, slow-paced bedtime adventure helping a sleepy owl whisper 'goodnight' to all the stars in the night sky.",
    ageRange: "1-4 years",
    numberOfPages: 8,
    promptTemplate: "Create a soothing, lyrical bedtime tale where MAIN_CHARACTER walks with a sleepy cloud friend, says goodnight to forest animals, and helps tuck the stars into bed under the glowing moon."
  }
];
