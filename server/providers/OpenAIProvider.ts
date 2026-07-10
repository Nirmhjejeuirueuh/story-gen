/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from "../database/db.js";
import { IllustrationStyle } from "../../src/types.js";

export class OpenAIProvider {
  private getApiKey(): string {
    const key = db.settings?.openaiApiKey || process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error("OpenAI API Key is not configured. Please set it in System Settings.");
    }
    return key;
  }

  /**
   * Generates a text response using configured OpenAI model
   */
  public async generateText(prompt: string, systemInstruction?: string, isJson: boolean = false): Promise<string> {
    const apiKey = this.getApiKey();
    const model = db.settings?.openaiModel || "gpt-4o-mini";

    const messages: any[] = [];
    if (systemInstruction) {
      messages.push({ role: "system", content: systemInstruction });
    }
    messages.push({ role: "user", content: prompt });

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        response_format: isJson ? { type: "json_object" } : undefined,
        temperature: 1.0,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API failed: ${response.status} - ${errText}`);
    }

    const data: any = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error("Empty text returned from OpenAI API.");
    }
    return text.trim();
  }

  /**
   * Generates a high-quality illustration using DALL-E
   */
  public async generateImage(prompt: string, style: IllustrationStyle): Promise<string> {
    const apiKey = this.getApiKey();
    const model = db.settings?.openaiImageModel || "gpt-image-1";

    console.log(`Attempting OpenAI image generation (${model}) for: "${prompt.slice(0, 60)}..."`);

    try {
      const response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          prompt,
          n: 1,
          size: "1024x1024",
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenAI Image generation failed: ${response.status} - ${errText}`);
      }

      const data: any = await response.json();
      const item = data.data?.[0];
      if (!item) {
        throw new Error("No image data returned from OpenAI API.");
      }

      // Newer image models (gpt-image-*) return base64 data directly
      if (item.b64_json) {
        return `data:image/png;base64,${item.b64_json}`;
      }

      // Older models (dall-e-*) may return a temporary URL instead
      if (item.url) {
        const imageRes = await fetch(item.url);
        if (!imageRes.ok) {
          throw new Error(`Failed to download generated image from ${item.url}`);
        }
        const arrayBuffer = await imageRes.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        const mime = imageRes.headers.get("content-type") || "image/png";
        return `data:${mime};base64,${base64}`;
      }

      throw new Error("No image URL or base64 data returned from OpenAI API.");
    } catch (error: any) {
      console.error("OpenAI image generation failed:", error.message || error);
      throw error;
    }
  }

  /**
   * Generates an illustration conditioned on one or more reference images (e.g. a fixed-cast
   * story's character sheets), so the same character(s) appear consistently across pages.
   * Falls back to plain text-to-image generation if no reference images are supplied.
   */
  public async generateImageWithReferences(
    prompt: string,
    referenceImages: { mime: string; data: string }[]
  ): Promise<string> {
    if (referenceImages.length === 0) {
      return this.generateImage(prompt, IllustrationStyle.STORYBOOK);
    }

    const apiKey = this.getApiKey();
    const model = db.settings?.openaiImageModel || "gpt-image-1";

    console.log(`Attempting OpenAI reference-conditioned image generation (${model}, ${referenceImages.length} refs) for: "${prompt.slice(0, 60)}..."`);

    try {
      const form = new FormData();
      form.append("model", model);
      form.append("prompt", prompt);
      form.append("size", "1024x1024");
      referenceImages.forEach((ref, i) => {
        const ext = ref.mime === "image/jpeg" ? "jpg" : "png";
        const blob = new Blob([Buffer.from(ref.data, "base64")], { type: ref.mime });
        form.append("image[]", blob, `reference_${i}.${ext}`);
      });

      const response = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenAI Image edit failed: ${response.status} - ${errText}`);
      }

      const data: any = await response.json();
      const item = data.data?.[0];
      if (!item?.b64_json) {
        throw new Error("No image data returned from OpenAI edits API.");
      }
      return `data:image/png;base64,${item.b64_json}`;
    } catch (error: any) {
      console.error("OpenAI reference-conditioned image generation failed:", error.message || error);
      throw error;
    }
  }

  /**
   * Generates a single comprehensive character reference sheet image
   * (proportions, three-view, expression sheet, pose sheet, costume design)
   */
  public async generateCharacterSheet(prompt: string): Promise<string> {
    console.log("Generating comprehensive character reference sheet using OpenAI...");
    try {
      return await this.generateImage(prompt, IllustrationStyle.STORYBOOK);
    } catch (err) {
      console.error("Failed to generate character reference sheet with OpenAI, falling back.", err);
      return this.createProceduralCharacterSheet();
    }
  }

  private createProceduralCharacterSheet(): string {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" width="100%" height="100%">
        <rect width="600" height="400" fill="#f8fafc" />
        <rect x="10" y="10" width="580" height="380" rx="10" fill="none" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="5 5" />

        <rect x="180" y="30" width="240" height="28" rx="4" fill="#64748b" />
        <text x="300" y="49" font-family="monospace" font-size="12" fill="#ffffff" text-anchor="middle" font-weight="bold" letter-spacing="1">
          CHARACTER REFERENCE SHEET
        </text>

        <text x="300" y="220" font-size="90" text-anchor="middle">🧑</text>

        <rect x="60" y="330" width="480" height="26" rx="4" fill="#64748b" />
        <text x="300" y="348" font-family="monospace" font-size="10" fill="#ffffff" text-anchor="middle" font-weight="bold" letter-spacing="1">
          SHEET GENERATION FAILED - PROCEDURAL PLACEHOLDER
        </text>
      </svg>
    `;

    return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  }
}

export const openaiProvider = new OpenAIProvider();
