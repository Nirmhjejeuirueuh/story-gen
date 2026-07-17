/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Firestore-backed LayoutPlan — mirrors TemplateStore's pattern exactly:
 *   layoutPlans/{planId}
 *   layoutPlans/{planId}/layouts/{layoutId}
 *
 * `server/config/layouts.ts` (PAGE_LAYOUTS) is the seed source AND the fallback if Firestore is
 * empty or unreachable — the same role the filesystem plays for TemplateStore. This means editing
 * a layout's prompt no longer requires a code deploy: it can be edited directly in Firestore, and
 * the in-memory cache (hydrated on startup, same as TemplateStore) backs live reads.
 */

import { getFirestore } from "../database/firestore.js";
import { LayoutPlanDoc, LayoutDoc } from "../../src/types.js";
import { PAGE_LAYOUTS, DEFAULT_LAYOUT_PLAN_ID, PageLayout } from "../config/layouts.js";

export class LayoutPlanStore {
  private db = getFirestore();

  // planId -> ordered layouts. Empty cache => callers fall back to the static PAGE_LAYOUTS.
  private cache = new Map<string, PageLayout[]>();
  private loaded = false;

  private col() {
    return this.db.collection("layoutPlans");
  }

  /** Seeds layoutPlans/{DEFAULT_LAYOUT_PLAN_ID} + its layouts subcollection, once, when empty. */
  async seedFromStatic(): Promise<void> {
    try {
      const existing = await this.col().limit(1).get();
      if (!existing.empty) return; // already seeded

      const now = new Date().toISOString();
      const planRef = this.col().doc(DEFAULT_LAYOUT_PLAN_ID);
      const batch = this.db.batch();

      const planDoc: LayoutPlanDoc = { id: DEFAULT_LAYOUT_PLAN_ID, name: "Default", createdAt: now };
      batch.set(planRef, planDoc);

      for (const layout of PAGE_LAYOUTS) {
        const layoutDoc: LayoutDoc = { layoutId: layout.layoutId, name: layout.name, prompt: layout.prompt };
        batch.set(planRef.collection("layouts").doc(String(layout.layoutId)), layoutDoc);
      }

      await batch.commit();
      console.log(`[LayoutPlanStore] Seeded layout plan "${DEFAULT_LAYOUT_PLAN_ID}" (${PAGE_LAYOUTS.length} layouts) into Firestore.`);
    } catch (error) {
      // Non-fatal: the static PAGE_LAYOUTS still work, so a seed failure must not block startup.
      console.error("[LayoutPlanStore] Failed to seed layout plans from static config:", error);
    }
  }

  /** Hydrates the in-memory cache from Firestore. Leaves the cache empty on failure (static fallback). */
  async loadAll(): Promise<void> {
    try {
      const plans = await this.col().get();
      const next = new Map<string, PageLayout[]>();
      await Promise.all(plans.docs.map(async (d) => {
        const layoutsSnap = await d.ref.collection("layouts").get();
        const layouts = layoutsSnap.docs
          .map((l) => l.data() as LayoutDoc)
          .sort((a, b) => a.layoutId - b.layoutId);
        if (layouts.length > 0) next.set(d.id, layouts);
      }));
      this.cache = next;
      this.loaded = true;
      console.log(`[LayoutPlanStore] Loaded ${next.size} layout plan(s) from Firestore into cache.`);
    } catch (error) {
      console.error("[LayoutPlanStore] Failed to load layout plans from Firestore (will fall back to static config):", error);
      this.loaded = false;
    }
  }

  /** The ordered layouts for a plan; falls back to the static PAGE_LAYOUTS if uncached/missing. */
  getLayouts(planId: string = DEFAULT_LAYOUT_PLAN_ID): PageLayout[] {
    if (this.loaded) {
      const cached = this.cache.get(planId);
      if (cached && cached.length > 0) return cached;
    }
    return PAGE_LAYOUTS;
  }

  /** Looks up one layout by id within a plan, falling back to the classic top-text layout (1). */
  getLayoutById(layoutId: number | null | undefined, planId: string = DEFAULT_LAYOUT_PLAN_ID): PageLayout {
    const layouts = this.getLayouts(planId);
    return layouts.find((l) => l.layoutId === layoutId) ?? layouts[0] ?? PAGE_LAYOUTS[0];
  }
}

export const layoutPlanStore = new LayoutPlanStore();
