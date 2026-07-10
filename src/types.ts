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
  storyText: string;
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
  illustrationPrompt: string;
  characterKeys: string[];
}

export interface StoryLibraryEntry {
  id: string;
  title: string;
  numberOfPages: number;
  characters: StoryLibraryCharacter[];
  chapters: StoryLibraryChapter[];
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
