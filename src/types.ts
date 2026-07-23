/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum IllustrationStyle {
  PIXAR = "Pixar",
  DISNEY = "Disney",
  WATERCOLOR = "Watercolor",
  STORYBOOK = "Storybook",
  CARTOON = "Cartoon",
  ANIME = "Anime",
  DREAMWORKS = "DreamWorks",
  CUTE_3D = "Cute 3D"
}

export interface Character {
  id: string;
  ownerId?: string; // Firebase uid of the user who created it; absent on legacy/shared records
  name: string;
  age: number;
  gender: string;
  description: string;
  photos: string[]; // base64 or object URLs
  hairColor?: string;
  hairStyle?: string;
  eyeColor?: string;
  skinTone?: string;
  clothingStyle?: string;
  accessories?: string;
  personality?: string;
  additionalNotes?: string;
  characterSheetId?: string;
  createdAt: string;
}

export interface CharacterSheet {
  id: string;
  characterId: string;
  sheetImage: string; // base64 image data or URL - a single comprehensive reference sheet
  approved: boolean;
  createdAt: string;
}

export interface Book {
  id: string;
  ownerId?: string; // Firebase uid of the user who created it; absent on legacy/shared records
  title: string;
  coverTitle: string;
  characterId?: string; // absent for fixed-cast library storybooks
  templateId: string;
  style: IllustrationStyle;
  styleId?: string; // Story Library art-style catalogue id (server/config/styles.ts); default when absent
  heroStyledSheetUrl?: string; // hero's reference sheet re-rendered in THIS book's styleId, when non-default;
                                // keeps the shared Character's own default-style sheet untouched
  childName: string;
  libraryStoryId?: string; // set when created from a filesystem Story Library entry
  pages: BookPage[];
  createdAt: string;
}

export interface BookPage {
  id: string;
  pageNumber: number;
  title?: string; // optional chapter heading; not rendered (text is baked into the image)
  storyText: string; // narrative text for this page — baked directly into the image at generation time
  illustrationPrompt: string;
  characterKeys?: string[]; // Story Library character reference keys used for this page's illustration
  layoutId?: number; // chosen page layout (see server/config/layouts.ts) — story text is baked into the image per this layout
  imageUrl?: string; // Generated image (story text already baked in)
  imageStatus: 'Queued' | 'Generating' | 'Completed' | 'Failed';
  imageError?: string;
  createdAt: string;
}

// --- Filesystem-based Story Library (server/stories/<id>/) ---
export interface StoryLibraryCharacter {
  key: string; // normalized lowercase filename stem, e.g. "white rabbit"
  displayName: string; // e.g. "White Rabbit"
}

export interface StoryLibraryChapter {
  pageNumber: number;
  storyText: string;
  illustrationPrompt: string;
  characterKeys: string[];
  hasIllustration?: boolean; // true when a cached illustration exists on disk under illustrations/
}

export interface StoryLibraryEntry {
  id: string;
  title: string;
  numberOfPages: number;
  tags: string[]; // theme/genre labels shown as chips on the library card (from tags.txt)
  characters: StoryLibraryCharacter[];
  chapters: StoryLibraryChapter[];
}

// --- Firestore-backed Story Templates (P1 of the DB restructure) ---
// Mirrors the filesystem Story Library into Firestore under:
//   storyTemplates/{id}
//   storyTemplates/{id}/pages/{pageNumber}
//   storyTemplates/{id}/characters/{key}
// The filesystem remains the seed source + fallback until reads are fully cut over.
export interface StoryTemplateDoc {
  id: string;
  title: string;
  tags: string[];
  pageCount: number;
  style: string;
  description?: string;
  layoutPlanId?: string; // which LayoutPlan the AI draws page layouts from (default: "default")
  createdAt: string;
}

export interface TemplatePageDoc {
  pageNumber: number;
  storyText: string;        // narrative text baked INTO the page image during generation
  illustrationPrompt: string;
  characterKeys: string[];
  layoutId?: number;        // the PageLayout chosen for this page (see server/config/layouts.ts)
  imageUrl?: string;        // the DEFAULT style's generated page image (text baked in) — kept for back-compat with generic-book reuse (BookController)
  imageUrls?: Record<string, string>; // generated page image per style id; the default style's entry mirrors `imageUrl`
}

// Firestore-backed LayoutPlan (mirrors the storyTemplates pattern above):
//   layoutPlans/{planId}
//   layoutPlans/{planId}/layouts/{layoutId}
// `server/config/layouts.ts` remains the seed source + fallback (used if Firestore is empty or
// unreachable), the same role the filesystem plays for storyTemplates.
export interface LayoutPlanDoc {
  id: string;
  name: string;
  createdAt: string;
}

export interface LayoutDoc {
  layoutId: number;
  name: string;
  prompt: string;
}

export interface TemplateCharacterDoc {
  key: string;               // normalized lowercase cast key, e.g. "white rabbit"
  name: string;              // display name, e.g. "White Rabbit"
  role?: string;             // optional placeholder role (e.g. MAIN_CHARACTER) for personalization
  prompt: string | null;     // character-sheet prompt (from charators/<key>.md); null if image-only
  sheetImageUrl: string;     // clean single reference image — used as the GENERATION reference
  displaySheetImageUrls?: Record<string, string>; // optional generated multi-view pose sheets — DISPLAY only, keyed by style id
  approved: boolean;
  createdAt: string;
  // When true, this character's reference photo is never sent as an image-conditioning input
  // on a page it shares with another character (only described in the text prompt). Set on
  // antagonist/dangerous-animal cast members (e.g. Shere Khan).
  textOnlyNearHumans?: boolean;
  // When true, on any page this character shares with a `textOnlyNearHumans`-flagged character,
  // THIS character's own reference photo is also dropped (text-only), in addition to the
  // antagonist's. In isolated testing (t10-the-jungle-book, Mowgli vs Shere Khan) this downgraded
  // a hard, deterministic Gemini image-safety block (PROHIBITED_CONTENT) to a soft, retriable one
  // (IMAGE_SAFETY). NOTE: a later full-pipeline batch run still failed on some Jungle Book pages
  // (including ones with no antagonist present), so this flag helps but is not a complete fix by
  // itself — the remaining failure mode is not yet understood. Set on human/child protagonists
  // who appear in danger scenes with a flagged antagonist.
  dropReferenceNearAntagonist?: boolean;
}

export enum JobType {
  CHARACTER_SHEET = "Generate Character Sheet",
  STORY = "Generate Story",
  IMAGE = "Generate Image",
  PDF = "Generate PDF"
}

export interface Job {
  id: string;
  type: JobType;
  status: 'Queued' | 'Generating' | 'Completed' | 'Failed';
  progress: number; // 0 to 100
  payload: any;
  result?: any;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SystemSettings {
  textProvider: 'gemini' | 'openai';
  imageProvider: 'gemini' | 'openai' | 'procedural';
  geminiApiKey: string;
  openaiApiKey: string;
  openaiModel: string;
  openaiImageModel: string;
}

// API DTOs
export interface UploadPhotosRequest {
  photos: string[]; // Array of base64 strings
}

export interface CreateCharacterRequest {
  name: string;
  age: number;
  gender: string;
  description: string;
  photos: string[];
  hairColor?: string;
  hairStyle?: string;
  eyeColor?: string;
  skinTone?: string;
  clothingStyle?: string;
  accessories?: string;
  personality?: string;
  additionalNotes?: string;
}

export interface CreateBookRequest {
  characterId: string;
  templateId: string;
  style: IllustrationStyle;
  childName: string;
}
