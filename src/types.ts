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

export interface StoryTemplate {
  id: string;
  title: string;
  coverImage: string;
  description: string;
  ageRange: string;
  numberOfPages: number;
  promptTemplate: string; // Dynamic instructions to direct the Gemini prompt engine
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
  childName: string;
  libraryStoryId?: string; // set when created from a filesystem Story Library entry
  pages: BookPage[];
  createdAt: string;
}

export interface BookPage {
  id: string;
  pageNumber: number;
  storyText: string; // canonical (English) text; kept for back-compat
  texts?: Record<string, string>; // language code -> text, e.g. { en: "...", ja: "..." }
  illustrationPrompt: string;
  characterKeys?: string[]; // Story Library character reference keys used for this page's illustration
  imageUrl?: string; // Generated image
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
  createdAt: string;
}

export interface TemplatePageDoc {
  pageNumber: number;
  storyText: string;
  illustrationPrompt: string;
  characterKeys: string[];
}

export interface TemplateCharacterDoc {
  key: string;               // normalized lowercase cast key, e.g. "white rabbit"
  name: string;              // display name, e.g. "White Rabbit"
  role?: string;             // optional placeholder role (e.g. MAIN_CHARACTER) for personalization
  prompt: string | null;     // character-sheet prompt (from charators/<key>.md); null if image-only
  sheetImageUrl: string;     // clean single reference image — used as the GENERATION reference
  displaySheetImageUrl?: string; // optional generated multi-view pose sheet — DISPLAY only
  approved: boolean;
  createdAt: string;
}

// --- Firestore-backed generated Stories (P1 Slice 3 of the DB restructure) ---
// stories/{id}                    (metadata + characterMap field)
// stories/{id}/pages/{pageNumber} (texts{} multi-language, per-page status)
// stories/{id}/characters/{charId}
// stories/{id}/generation/status
// Mirrors the existing `books` collection; books stay primary until reads are cut over.
export interface StoryDoc {
  id: string;
  title: string;
  description: string;
  coverImageUrl: string;
  coverPrompt: string;
  style: string;
  language: string[];
  pageCount: number;
  status: "draft" | "generating" | "completed";
  templateId: string;
  libraryStoryId: string | null;
  createdBy: string | null;
  characterMap: Record<string, string>; // role placeholder -> characterId, e.g. MAIN_CHARACTER -> main
  // Compat fields so a stories/{id} doc round-trips losslessly back to the legacy Book shape
  // while both models coexist (books stays write-primary during the migration).
  childName: string;
  characterId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StoryPageDoc {
  pageNumber: number;
  title: string;
  illustrationPrompt: string;
  illustrationImageUrl: string;
  texts: Record<string, string>; // language code -> text, e.g. { en: "..." }
  characterIds: string[];
  status: "Queued" | "Generating" | "Completed" | "Failed";
  regeneratedCount: number;
}

export interface StoryCharacterDoc {
  id: string;                      // "main" for the custom hero, else the cast key
  role: string;                    // placeholder role, e.g. MAIN_CHARACTER or SHERE_KHAN
  name: string;
  type: "custom" | "template";
  characterSheetImageUrl: string;
  prompt: string | null;
  approved: boolean;
  style: string;
  createdAt: string;
}

export interface GenerationStatusDoc {
  characterSheetStatus: string;
  storyStatus: string;
  imagesStatus: string;
  completedPages: number;
  totalPages: number;
  pdfStatus: string;
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

export interface AppConfig {
  templates: StoryTemplate[];
  styles: { value: IllustrationStyle; label: string; description: string; preview: string }[];
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
