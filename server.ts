/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import apiRouter from "./server/routes/routes.js";
import { db } from "./server/database/db.js";
import { templateStore } from "./server/services/TemplateStore.js";
import { layoutPlanStore } from "./server/services/LayoutPlanStore.js";

// Load environment variables
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const HOST = "0.0.0.0";

  // Hydrate the in-memory cache from Firestore before serving any requests.
  console.log("[Server] Initializing Firestore database...");
  await db.init();

  // Mirror the filesystem Story Library into Firestore storyTemplates (one-time seed when empty),
  // then hydrate the in-memory cache that backs library reads. The filesystem remains the seed
  // source and read fallback. (Generated books live in the single `books` collection.)
  await templateStore.seedFromFilesystem();
  await templateStore.loadAll();

  // Same pattern for the LayoutPlan catalogue: seed once from the static config, then hydrate
  // the cache. server/config/layouts.ts remains the seed source + fallback.
  await layoutPlanStore.seedFromStatic();
  await layoutPlanStore.loadAll();

  // Large limit for base64 photo uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Health check — declared before the API router so it stays public (the router auth-gates
  // everything mounted under it).
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  console.log("[Server] Mounting API Router at /api...");
  app.use("/api", apiRouter);

  // Serve static assets or mount Vite dev server middleware
  if (process.env.NODE_ENV !== "production") {
    console.log("[Server] Development mode detected. Mounting Vite dev server middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("[Server] Production mode detected. Serving static assets from /dist...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`[Server] Service running at http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("[Server] Critical startup failure:", err);
});
