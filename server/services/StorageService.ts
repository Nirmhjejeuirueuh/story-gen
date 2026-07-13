/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Image storage on Google Cloud Storage.
 *
 * Generated illustrations and character sheets used to be stored inline as base64 data URIs
 * (which bloated the DB and, critically, exceed Firestore's 1 MB per-document limit). This
 * service uploads them to a private GCS bucket instead and returns a stable app URL of the
 * form `/api/images/<objectPath>`, which the browser loads via the streaming proxy route.
 * The bucket stays private (fits the "private platform" model); no public ACLs required.
 *
 * Behaviour is gated by IMAGE_STORAGE:
 *   - unset / "gcs"  → upload to GCS, store the proxy URL (default now that the bucket exists)
 *   - "base64"       → keep the legacy inline data URI (no upload)
 * Any upload failure degrades gracefully to returning the original data URI, so image
 * generation never hard-fails just because storage is unavailable.
 */

import { Storage } from "@google-cloud/storage";
import path from "path";
import type { Response } from "express";

class StorageService {
  private storage: Storage | null = null;
  private readonly bucketName: string;
  private enabled: boolean;

  constructor() {
    this.bucketName = process.env.GCS_BUCKET || "storygen-6e3af-images";
    this.enabled = process.env.IMAGE_STORAGE !== "base64";
    if (this.enabled) {
      try {
        // Prefer an env-provided key (production), else the local git-ignored key file (dev).
        const envJson = process.env.FIREBASE_SERVICE_ACCOUNT;
        this.storage = envJson
          ? new Storage({ credentials: JSON.parse(envJson) })
          : new Storage({ keyFilename: path.join(process.cwd(), "server", "serviceAccountKey.json") });
      } catch (err: any) {
        console.error("[StorageService] Init failed, falling back to inline base64:", err.message);
        this.enabled = false;
      }
    }
  }

  get isEnabled(): boolean {
    return this.enabled && !!this.storage;
  }

  private extFromMime(mime: string): string {
    if (mime.includes("png")) return "png";
    if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
    if (mime.includes("webp")) return "webp";
    if (mime.includes("svg")) return "svg";
    return "png";
  }

  /**
   * Uploads a base64 image data URI to GCS and returns a `/api/images/<path>` URL.
   * Returns the input unchanged when storage is disabled, the input is not a base64 data URI
   * (e.g. an SVG procedural placeholder or an already-migrated URL), or the upload fails.
   */
  async uploadDataUri(dataUri: string, destPathNoExt: string): Promise<string> {
    if (!this.isEnabled) return dataUri;
    const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUri || "");
    if (!match) return dataUri;
    const [, mime, b64] = match;
    const objectPath = `${destPathNoExt}.${this.extFromMime(mime)}`;
    try {
      await this.storage!.bucket(this.bucketName).file(objectPath).save(Buffer.from(b64, "base64"), {
        contentType: mime,
        resumable: false,
        metadata: { cacheControl: "public, max-age=31536000" },
      });
      return `/api/images/${objectPath}`;
    } catch (err: any) {
      console.error(`[StorageService] Upload failed for ${objectPath}, keeping inline base64:`, err.message);
      return dataUri;
    }
  }

  /**
   * Resolves an image (inline data URI OR a `/api/images/<path>` GCS URL) into the
   * { mime, data(base64) } shape the providers need for reference-conditioned generation.
   * GCS-backed references are downloaded and re-encoded. Returns null for SVG procedural
   * placeholders or anything that isn't a usable image reference.
   */
  async resolveReference(src: string): Promise<{ mime: string; data: string } | null> {
    if (!src) return null;

    const inline = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(src);
    if (inline) {
      const [, mime, data] = inline;
      if (mime === "image/svg+xml") return null;
      return { mime, data };
    }

    const prefix = "/api/images/";
    if (this.storage && src.startsWith(prefix)) {
      try {
        const objectPath = src.slice(prefix.length);
        const file = this.storage.bucket(this.bucketName).file(objectPath);
        const [buf] = await file.download();
        const [meta] = await file.getMetadata();
        const mime = meta.contentType || "image/png";
        if (mime === "image/svg+xml") return null;
        return { mime, data: buf.toString("base64") };
      } catch (err: any) {
        console.error("[StorageService] resolveReference download failed:", err.message);
        return null;
      }
    }

    return null;
  }

  /** Uploads raw bytes to an exact object path (used for cast reference images). */
  async uploadBuffer(objectPath: string, buffer: Buffer, mime: string): Promise<void> {
    if (!this.storage) throw new Error("Storage not configured");
    await this.storage.bucket(this.bucketName).file(objectPath).save(buffer, {
      contentType: mime,
      resumable: false,
      metadata: { cacheControl: "public, max-age=31536000" },
    });
  }

  /** Returns the first object whose name starts with `prefix` (e.g. "casts/story/key."), or null. */
  async findObjectByPrefix(prefix: string): Promise<string | null> {
    if (!this.storage) return null;
    const [files] = await this.storage.bucket(this.bucketName).getFiles({ prefix });
    return files.length ? files[0].name : null;
  }

  /** Downloads an object as a { mime, data(base64) } reference; null if missing/unavailable. */
  async getObjectAsReference(objectPath: string): Promise<{ mime: string; data: string } | null> {
    if (!this.storage) return null;
    try {
      const file = this.storage.bucket(this.bucketName).file(objectPath);
      const [exists] = await file.exists();
      if (!exists) return null;
      const [buf] = await file.download();
      const [meta] = await file.getMetadata();
      return { mime: meta.contentType || "image/jpeg", data: buf.toString("base64") };
    } catch (err: any) {
      console.error("[StorageService] getObjectAsReference failed:", err.message);
      return null;
    }
  }

  /** Streams a stored object to an HTTP response. `objectPath` is everything after /api/images/. */
  async streamTo(objectPath: string, res: Response): Promise<void> {
    if (!this.storage) {
      res.status(503).end("Storage not configured");
      return;
    }
    const file = this.storage.bucket(this.bucketName).file(objectPath);
    const [exists] = await file.exists();
    if (!exists) {
      res.status(404).end("Not found");
      return;
    }
    const [meta] = await file.getMetadata();
    if (meta.contentType) res.setHeader("Content-Type", meta.contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000");
    file.createReadStream()
      .on("error", () => {
        if (!res.headersSent) res.status(500).end("Stream error");
      })
      .pipe(res);
  }
}

export const storageService = new StorageService();
