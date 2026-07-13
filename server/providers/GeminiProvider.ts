/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from "@google/genai";
import { IllustrationStyle } from "../../src/types.js";
import { db } from "../database/db.js";

export class GeminiProvider {
  private getAI(): GoogleGenAI {
    const apiKey = db.settings?.geminiApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Gemini API Key is not configured. Please set it in System Settings.");
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }

  /**
   * Generates a text response using gemini-3.5-flash
   */
  public async generateText(prompt: string, systemInstruction?: string, isJson: boolean = false): Promise<string> {
    let ai;
    try {
      ai = this.getAI();
    } catch (err: any) {
      throw new Error("Gemini AI is not initialized. Please configure your settings or API key.");
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: isJson ? "application/json" : undefined,
          temperature: 1.0,
        },
      });

      if (!response || !response.text) {
        throw new Error("Received empty text response from Gemini API.");
      }

      return response.text.trim();
    } catch (error: any) {
      console.error("Gemini text generation failed:", error);
      throw error;
    }
  }

  /**
   * Generates a high-quality illustration using gemini-3.1-flash-lite-image
   * Falls back to high-quality procedural SVG/canvas art if API fails (e.g. key limits)
   */
  public async generateImage(prompt: string, style: IllustrationStyle): Promise<string> {
    // Gemini occasionally returns a response with NO inline image (text-only), which previously
    // dropped straight to a procedural placeholder — the cause of intermittent blank pages.
    // Retry a few times on both thrown errors and empty results before falling back.
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const ai = this.getAI();
        console.log(`Attempting Gemini image generation (attempt ${attempt}/${maxAttempts}) for: "${prompt.slice(0, 60)}..."`);
        const response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite-image",
          contents: { parts: [{ text: prompt }] },
          config: { imageConfig: { aspectRatio: "1:1" } }
        });

        if (response && response.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.data) {
              const mime = part.inlineData.mimeType || "image/png";
              return `data:${mime};base64,${part.inlineData.data}`;
            }
          }
        }
        console.warn(`No inline image data in Gemini response (attempt ${attempt}/${maxAttempts}).`);
      } catch (error: any) {
        console.error(`Gemini image generation failed (attempt ${attempt}/${maxAttempts}):`, error.message || error);
      }
      if (attempt < maxAttempts) await new Promise((r) => setTimeout(r, attempt * 800));
    }

    console.warn("Gemini returned no image after retries. Falling back to procedural design.");
    return this.createProceduralIllustration(prompt, style);
  }

  /**
   * Generates an illustration conditioned on one or more reference images (e.g. a fixed-cast
   * story's character sheets), so the same character(s) appear consistently across pages.
   * Falls back to plain text-to-image generation if no reference images are supplied.
   */
  public async generateImageWithReferences(
    prompt: string,
    referenceImages: { mime: string; data: string }[],
    style: IllustrationStyle
  ): Promise<string> {
    if (referenceImages.length === 0) {
      return this.generateImage(prompt, style);
    }

    const parts: any[] = referenceImages.map((ref) => ({
      inlineData: { mimeType: ref.mime, data: ref.data }
    }));
    parts.push({ text: prompt });

    // Retry on thrown errors and empty (image-less) responses before falling back, so a
    // one-off Gemini miss doesn't leave a blank page.
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const ai = this.getAI();
        console.log(`Attempting Gemini reference-conditioned image generation (${referenceImages.length} refs, attempt ${attempt}/${maxAttempts}) for: "${prompt.slice(0, 60)}..."`);

        const response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite-image",
          contents: { parts },
          config: { imageConfig: { aspectRatio: "1:1" } }
        });

        if (response && response.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.data) {
              const mime = part.inlineData.mimeType || "image/png";
              return `data:${mime};base64,${part.inlineData.data}`;
            }
          }
        }
        console.warn(`No inline image data in reference-conditioned response (attempt ${attempt}/${maxAttempts}).`);
      } catch (error: any) {
        console.error(`Gemini reference-conditioned generation failed (attempt ${attempt}/${maxAttempts}):`, error.message || error);
      }
      if (attempt < maxAttempts) await new Promise((r) => setTimeout(r, attempt * 800));
    }

    console.warn("Gemini returned no reference-conditioned image after retries. Falling back to procedural design.");
    return this.createProceduralIllustration(prompt, style);
  }

  /**
   * Generates a single comprehensive character reference sheet image
   * (proportions, three-view, expression sheet, pose sheet, costume design).
   * generateImage already falls back to a procedural illustration internally on failure.
   */
  public async generateCharacterSheet(prompt: string): Promise<string> {
    console.log("Generating comprehensive character reference sheet...");
    return this.generateImage(prompt, IllustrationStyle.STORYBOOK);
  }

  /**
   * Generates a beautifully styled fallback vector image based on the prompt's theme.
   */
  public createProceduralIllustration(prompt: string, style: IllustrationStyle): string {
    // Detect keywords to determine color palette and focal icons
    const lowerPrompt = prompt.toLowerCase();
    let themeColor = "rgb(59, 130, 246)"; // Blue default
    let secondaryColor = "rgb(147, 197, 253)";
    let backgroundGradient = "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)";
    let shapes = "";

    if (lowerPrompt.includes("dinosaur") || lowerPrompt.includes("forest") || lowerPrompt.includes("prehistoric")) {
      themeColor = "#10b981"; // Green
      secondaryColor = "#34d399";
      backgroundGradient = "linear-gradient(135deg, #064e3b 0%, #10b981 100%)";
      shapes = `
        <path d="M100,200 Q150,120 200,200 T300,200" fill="none" stroke="#047857" stroke-width="12" stroke-linecap="round"/>
        <circle cx="200" cy="180" r="40" fill="#34d399" opacity="0.8"/>
        <polygon points="120,380 200,250 280,380" fill="#047857"/>
        <text x="200" y="240" font-size="70" text-anchor="middle">🦕</text>
      `;
    } else if (lowerPrompt.includes("space") || lowerPrompt.includes("star") || lowerPrompt.includes("rocket") || lowerPrompt.includes("cosmic")) {
      themeColor = "#6366f1"; // Indigo
      secondaryColor = "#a5b4fc";
      backgroundGradient = "linear-gradient(135deg, #31106a 0%, #4338ca 100%)";
      shapes = `
        <circle cx="200" cy="200" r="120" fill="none" stroke="#818cf8" stroke-width="2" stroke-dasharray="10, 5"/>
        <circle cx="280" cy="120" r="30" fill="#fef08a" opacity="0.9"/>
        <circle cx="80" cy="280" r="15" fill="#f43f5e" opacity="0.8"/>
        <text x="200" y="240" font-size="80" text-anchor="middle">🚀</text>
        <circle cx="150" cy="80" r="4" fill="#fff" />
        <circle cx="250" cy="280" r="3" fill="#fff" />
        <circle cx="320" cy="220" r="5" fill="#fff" opacity="0.5"/>
      `;
    } else if (lowerPrompt.includes("unicorn") || lowerPrompt.includes("magic") || lowerPrompt.includes("fairy") || lowerPrompt.includes("castle")) {
      themeColor = "#ec4899"; // Pink
      secondaryColor = "#fbcfe8";
      backgroundGradient = "linear-gradient(135deg, #701a75 0%, #ec4899 100%)";
      shapes = `
        <path d="M50,200 Q200,50 350,200" fill="none" stroke="#f472b6" stroke-width="8" stroke-linecap="round"/>
        <circle cx="200" cy="180" r="60" fill="#fdf2f8" opacity="0.3"/>
        <text x="200" y="240" font-size="80" text-anchor="middle">🦄</text>
        <polygon points="100,100 110,120 130,120 115,130 120,150 100,140 80,150 85,130 70,120 90,120" fill="#fef08a"/>
        <polygon points="300,150 305,160 315,160 307,165 310,175 300,170 290,175 293,165 285,160 295,160" fill="#fef08a" opacity="0.7"/>
      `;
    } else if (lowerPrompt.includes("jungle") || lowerPrompt.includes("safari") || lowerPrompt.includes("monkey") || lowerPrompt.includes("lion")) {
      themeColor = "#15803d"; // Deep Green
      secondaryColor = "#86efac";
      backgroundGradient = "linear-gradient(135deg, #14532d 0%, #15803d 100%)";
      shapes = `
        <path d="M0,400 C150,300 250,300 400,400" fill="#166534"/>
        <path d="M0,350 C100,280 300,280 400,350" fill="#15803d" opacity="0.8"/>
        <text x="200" y="230" font-size="75" text-anchor="middle">🦁</text>
        <text x="110" y="280" font-size="50" text-anchor="middle">🐒</text>
      `;
    } else if (lowerPrompt.includes("pirate") || lowerPrompt.includes("treasure") || lowerPrompt.includes("island") || lowerPrompt.includes("ship")) {
      themeColor = "#eab308"; // Amber
      secondaryColor = "#fef08a";
      backgroundGradient = "linear-gradient(135deg, #7c2d12 0%, #d97706 100%)";
      shapes = `
        <path d="M50,300 Q200,220 350,300" fill="none" stroke="#ea580c" stroke-width="5"/>
        <circle cx="200" cy="180" r="50" fill="#fef08a" opacity="0.4"/>
        <text x="200" y="240" font-size="80" text-anchor="middle">🏴‍☠️</text>
        <text x="300" y="270" font-size="50" text-anchor="middle">💎</text>
      `;
    } else if (lowerPrompt.includes("bedtime") || lowerPrompt.includes("sleep") || lowerPrompt.includes("night") || lowerPrompt.includes("owl")) {
      themeColor = "#1e293b"; // Slate Dark
      secondaryColor = "#94a3b8";
      backgroundGradient = "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)";
      shapes = `
        <path d="M300,80 A60,60 0 1,0 220,160 A80,80 0 1,1 300,80 Z" fill="#fef08a"/>
        <text x="160" y="240" font-size="70" text-anchor="middle">🦉</text>
        <text x="260" y="280" font-size="40" text-anchor="middle">💤</text>
      `;
    } else {
      // General magical storybook
      themeColor = "#8b5cf6"; // Purple
      secondaryColor = "#c084fc";
      backgroundGradient = "linear-gradient(135deg, #4c1d95 0%, #8b5cf6 100%)";
      shapes = `
        <rect x="100" y="120" width="200" height="160" rx="15" fill="#fdf2f8" opacity="0.1" stroke="#fff" stroke-width="2"/>
        <text x="200" y="230" font-size="75" text-anchor="middle">📚</text>
        <circle cx="120" cy="100" r="15" fill="#e9d5ff" opacity="0.8"/>
        <circle cx="280" cy="300" r="25" fill="#e9d5ff" opacity="0.6"/>
      `;
    }

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${backgroundGradient.match(/#\w+/g)?.[0] || "#3b82f6"}" />
            <stop offset="100%" stop-color="${backgroundGradient.match(/#\w+/g)?.[1] || "#1d4ed8"}" />
          </linearGradient>
          <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="8" stdDeviation="6" flood-opacity="0.3"/>
          </filter>
        </defs>
        <rect width="400" height="400" fill="url(#bg)" />
        
        <!-- Whimsical frame overlay -->
        <rect x="15" y="15" width="370" height="370" rx="10" fill="none" stroke="#ffffff" stroke-width="3" stroke-dasharray="10 5" opacity="0.3"/>
        
        <!-- Dynamic scene elements -->
        <g filter="url(#shadow)">
          ${shapes}
        </g>
        
        <!-- Style caption -->
        <rect x="25" y="340" width="350" height="30" rx="5" fill="rgba(0, 0, 0, 0.4)"/>
        <text x="200" y="360" font-family="system-ui, sans-serif" font-size="12" fill="#ffffff" text-anchor="middle" font-weight="600" letter-spacing="1">
          STYLE: ${style.toUpperCase()} • SCENE ILLUSTRATED
        </text>
      </svg>
    `;

    return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  }
}
export const geminiProvider = new GeminiProvider();
