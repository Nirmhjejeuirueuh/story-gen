# Changelog

All notable changes to StoryGen are recorded here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/). Newest entries at the top.

## [Unreleased]

### Fixed — text scrim was rendering as a hard-edged box on one layout
- Layout 4 (Full Width Header Text) came out with a visibly rectangular translucent band behind
  the text — inconsistent with the soft, cloud-like fade the other layouts produced. Root cause:
  its prompt said "full-width band", which pushed the model toward a literal geometric shape.
  Rewrote all 7 layouts' scrim language (and the shared `PROFESSIONAL_FINISH`) to explicitly
  require an irregular, cloud-like glow that fades unevenly in every direction, explicitly
  forbidding any rectangle/band/panel/box shape or visible straight edge. Migrated to Firestore
  and verified by regenerating the exact page that failed (Little Red Riding Hood pg 1, layout 4)
  — confirmed soft irregular fade, no hard edge.

### Changed — illustration now fills the entire page; text overlaid on top
- Per feedback: the illustration must cover every pixel of the page edge to edge (no parchment
  strip or margin anywhere), with the story text layered directly on top of the artwork using a
  soft translucent scrim for legibility — like a real picture-book spread, not a text box next to
  a picture. Rewrote all 7 layout prompts (`server/config/layouts.ts`) and `PromptEngine.
  PROFESSIONAL_FINISH` to compose this way; each layout still varies WHERE the text sits (top,
  floating, diagonal, header, side, curved), just not as a reserved zone anymore. Migrated all 7
  updated prompts into the live Firestore `layoutPlans` collection (seed-once means a config edit
  alone doesn't reach already-seeded docs). Verified with a real render (Little Red Riding Hood):
  full-bleed confirmed, text overlay confirmed legible.
- Same render also surfaced a second data point for the recurring duplicate-word issue: both
  duplications ("off off", "on on") landed exactly at a line-wrap boundary — suggests the image
  model specifically tends to repeat the last word of a line when wrapping, not just random noise.
  Still unfixed pending a decision on the verify/retry approach discussed earlier.

### Changed — removed the ornamental page border
- Per feedback after reviewing real generated pages (Alice, Little Red Riding Hood): dropped the
  gold border + corner flourishes from `PromptEngine.PROFESSIONAL_FINISH` and layout 7's prompt.
  Pages are now borderless full-bleed parchment with just the illustration and the small text
  divider — only the text *placement* varies per layout now, no decorative frame. Verified with a
  real render (Little Red Riding Hood page 1): confirmed borderless.
- Also confirmed a real, recurring risk while reviewing those same generated pages: baked-in text
  can come out duplicated ("magical magical", "busy busy") or garbled ("sushrour" for "mushroom",
  dropped letters in "politely a[nd] asked ... where s[he] was going"). The first is a text-model
  slip (fixable by editing that page's text and regenerating); the second is an inherent weakness
  of baking text into AI-generated images — no prompt wording guarantees correct spelling, it can
  only be caught after generation. Not yet fixed — flagged for a possible automated verify/retry
  step (re-check the rendered text against the intended text, retry on mismatch) if wanted.

### Changed — unified the book-image pipeline onto pre-generated, text-baked pages
Two disconnected image pipelines existed: the admin "Generate" pipeline (AI picks layout, writes
text, bakes it into the image — built earlier this session but never actually consumed) and the
real book-creation path (`createBookFromLibrary` + `QueueService.executeImageJob`), which still
read the legacy hand-authored `chapters/*.md` files and rendered **text-free** images with the
text drawn separately as HTML/PDF-vector-text. This is why created books still showed the old
no-text look. Unified everything onto the first pipeline:
- **Prompt safety.** `generatePagesPrompt` now explicitly forbids depicting a lone, unsupervised
  child/baby in a risky scene (fire, height, isolation) — always require a companion in frame.
  Verified against the real API on the Jungle Book story: every previously-failing scene
  (`PROHIBITED_CONTENT`, reproduced this session) now includes Mother Wolf/Bagheera/Baloo in
  frame; the reworded page 1 rendered successfully end-to-end. Not a 100% guarantee — Gemini's
  child-safety filter is stricter for some scenes (fire-holding, even with a companion) and can
  still reject; the app now surfaces the real `finishReason` so a failure is actionable.
- **New layout 7 — wordless full illustration.** Added to `server/config/layouts.ts` and the live
  Firestore `layoutPlans` collection. `generatePagesPrompt` picks it ~1 in 6-8 pages, only at a
  natural pause, folding any lost plot beat into the next page's text. Verified: a 16-page
  regeneration produced 2 wordless pages, both at genuine scene breaks, no narrative gap.
- **Professional page finish**, rewritten to match a reference image: ornamental gold border
  framing all four page edges (not just the text), corner flourishes, one continuous parchment
  tone under text and art, elegant serif lettering with a small divider. Verified visually.
- **Auto-generate on first use.** `StoryLibraryController.generatePagesForStory`/
  `generatePageImageForStory` extracted into reusable methods (`ensurePagesGenerated`,
  `ensurePageImage`) so book creation can call them directly instead of requiring an admin step.
- **`createBookFromLibrary`** now builds book pages from the story's pre-generated template pages
  (`templateStore.getPages`) instead of the legacy chapter files. Non-personalized books reuse the
  template's already-rendered image instantly (no Gemini spend); personalized books (child's own
  photo as hero) queue a fresh render per page via `QueueService.executeImageJob`, rewritten to
  build the prompt with `buildTextPageImagePrompt` (baked text) instead of the retired
  `withNoText`, keeping the existing hero-photo conditioning.
- **Removed dead code this created:** the `executeImageJob` non-library branch (unreachable since
  every remaining book has `libraryStoryId`), `PromptEngine.generateIllustrationPrompt`/
  `NO_TEXT_CONSTRAINT`/`withNoText`, `StoryLibraryService.saveIllustration` (legacy on-disk cache,
  superseded by the Firestore/GCS template-image cache).
- **Retired the HTML text-overlay system**, now redundant: `BookPreview.tsx`'s language switcher,
  `textZone` drag-to-reposition editor, and paragraph/drop-cap text rendering; `PDFExportDialog`'s
  separate vector-text drawing (each PDF page is now just the full-bleed page image); `BookPage.
  textZone`/`texts` (i18n dict) types; `BookController.updatePageLayout` and its route. The ZIP
  export's `story_script.txt` (text + prompts as reference) is unchanged.
- Verified with `tsc --noEmit` and `npm run build` after every step, plus live Gemini calls
  against the Jungle Book story (page regeneration + 3 test image renders) — see above.
- **Out of scope this pass:** reviewing the user's uploaded `alice story.pdf` for spelling
  mistakes — blocked, this environment is missing `poppler-utils` so PDF pages can't be rendered;
  needs specific pages as images or a written list instead. Retroactively regenerating all 19
  stories' pages under the new pipeline (cost) — only the pipeline/prompts were fixed so future
  admin-triggered "Generate" runs are correct; existing stories still need a manual re-run.

### Removed — the old "custom template" book-creation flow, and the templates collection
- Traced why a manually-deleted Firestore `templates` collection kept reappearing: `db.ts`
  reseeded it from a hardcoded `DEFAULT_TEMPLATES` array on every server startup if the
  collection was empty — by design, but nobody actually uses this collection anymore.
- Confirmed the whole flow it fed is dead: wizard steps "Choose Illustration Style" (4) and
  "Draft Story Text" (5), `createBook` (`POST /api/books`), `regenerateStoryText`
  (`POST /books/:id/regenerate-story`), and the `STORY` background job type. The Story Library
  flow (`createBookFromLibrary`) fully replaced this — it jumps straight from character
  creation to illustration rendering (step 6) and never sets the state (`selectedTemplateId`)
  this old path required, so it was permanently unreachable, not just unused.
- Removed the full vertical: the two dead wizard steps + their handlers/state in `App.tsx`;
  `createBook`/`regenerateStoryText`/`getTemplates` in `BookController`; `executeStoryJob` +
  the `STORY` dispatch case in `QueueService`; `getTemplates`/`findTemplateById` in
  `BookRepository`; `validateBook`; the `templates` schema field + seed-on-init logic in `db.ts`;
  `DEFAULT_TEMPLATES`/`DEFAULT_STYLES` in `server/config/config.ts`; the `StoryTemplate`/
  `AppConfig` types; and the already-orphaned, never-rendered `StorySelector.tsx`. Deleted the
  `templates` Firestore collection — it will not come back, since nothing seeds it anymore.
- Verified with `tsc --noEmit` and a full `npm run build` (clean) after every step.

### Fixed — real errors instead of generic "failed" messages
- Diagnosed a page-image failure (Jungle Book pg 1, a lone-baby scene) down to Gemini's own API:
  `finishReason: PROHIBITED_CONTENT` — its safety filter blocking a depiction of an unsupervised
  child, not a bug. `GeminiProvider` now captures and surfaces `finishReason` in the thrown error
  (with a specific hint for `PROHIBITED_CONTENT`) instead of a generic "no image after retries."
  `StoryLibraryController`/`StoryLibraryBrowser` now propagate that real message all the way to
  the editor UI instead of the previous hardcoded "Image generation failed"/"Save failed" — and
  error messages render in red instead of the same green used for success.

### Changed — any signed-in user can now manage any book
- `BookController.canModifyBook` no longer restricts edit/delete/regenerate to the book's owner —
  any signed-in user can manage any book now, matching the same "shared, not multi-tenant"
  reasoning already applied to story templates. `Book.ownerId` is still recorded at creation for
  attribution, it just no longer gates actions. `ADMIN_EMAILS` remains the only real access gate
  left in the app (System Settings / API keys). Also fixed the "My Books" delete button silently
  no-oping on failure — it now surfaces an error if a delete ever fails for any other reason.

### Added — LayoutPlan is now a real Firestore collection
- Per owner/mentor request, reversed the earlier "keep layouts static" simplification.
  `server/services/LayoutPlanStore.ts` mirrors `TemplateStore`'s exact pattern: seeds
  `layoutPlans/{planId}` + `layoutPlans/{planId}/layouts/{layoutId}` from
  `server/config/layouts.ts` once when the collection is empty, hydrates an in-memory cache on
  startup, and falls back to the static config if Firestore is empty/unreachable — so this can't
  break generation even if the collection is missing or mid-migration. `StoryLibraryController`
  (`listLayouts`, `generatePages`, `updatePage`, `generatePageImage`) now reads through
  `layoutPlanStore` instead of the static array directly. New types: `LayoutPlanDoc`, `LayoutDoc`
  (`src/types.ts`). Net effect: layout prompts can now be edited directly in Firestore without a
  code deploy. Verified end-to-end: seed → cache load → `getLayoutById` lookups → re-seed is a
  no-op → `tsc`/`vite build` clean.

### Changed — open template editing, cleanup, and image-quality pass
- **Any signed-in user can now Generate/edit story-template pages**, not just admin. Removed
  `adminOnly` from `POST .../generate-pages`, `PATCH .../pages/:n`, `POST .../pages/:n/generate-image`,
  and `POST .../characters/:key/regenerate-sheet`; removed the `isAdmin &&` gate around the
  "Generate" button in `StoryLibraryBrowser`. Templates are shared/collaborative — there's no
  per-user ownership on them to restrict by.
- **Removed dead code:** the unreachable legacy per-chapter illustration endpoints
  (`regenerateChapterIllustration`, `getChapterIllustration` + their routes — no frontend caller
  since the old illustration grid was deleted), and the orphaned "Configurable Templates" admin
  tab (`TemplateConfig.tsx`, its `templates` nav case, `saveTemplate`/`deleteTemplate` on both
  `BookController` and `BookRepository`, and the `POST`/`DELETE /api/templates` routes) — this tab
  had no sidebar entry point and was unreachable. `GET /api/templates` is kept: it still feeds the
  custom photo-book wizard's template picker, which is a separate, still-live flow.
- **Reset stale legacy pages.** Discovered all 19 story templates' `pages` subcollections still
  held the one-time seed mirror of the old `chapters/*.md` files (pre-redesign), never actually
  run through the new AI "Generate Pages" pipeline — that's why Alice showed a stray page-4 image
  and Robinson Crusoe's pages looked inconsistent/basic: those images were generated by hitting
  "Generate Image" directly on stale legacy text with no `layoutId`, not via the real pipeline.
  Cleared all 285 stale page docs across all 19 templates back to a clean "no pages yet" state.
- **Upgraded page-image prompt for a professional finish.** `PromptEngine.buildTextPageImagePrompt`
  now adds a shared "finish" directive (`PROFESSIONAL_FINISH`) on top of whichever of the 6 layouts
  is chosen: the whole page must read as one continuous full-bleed hand-painted piece (shared
  parchment texture/lighting under the text, not a plain box stacked on a picture), with a subtle
  ornamental border + flourish around the text and elegant serif/calligraphic lettering — aimed at
  the "vintage illustrated storybook page" look the owner referenced, instead of the earlier plain
  text-box-plus-picture result.
- Updated `CLAUDE.md` to match reality: removed stale mentions of `StoryStore`/`stories` mirror and
  a Firestore `layoutPlans` collection (layouts are static config); documented that story-template
  editing is now open to any signed-in user; flagged that book creation is still NOT wired to the
  new template `pages[].imageUrl` (see "Still to do" below).

### In progress — "Pre-generated pages + baked-in text" redesign
A major redesign is underway. Decisions locked with the project owner:
- **Images are the pages.** Story text is now baked *into* each generated image (composed per a
  chosen layout), rather than rendered as separate HTML. The HTML text-overlay + drag layout
  editor + no-text-in-image guard are being retired.
- **Generate once, reuse.** A story's illustrations are generated one time at the *template*
  level and reused across users; personalising by swapping only the main character is a future
  step (layering).
- **LayoutPlan.** A catalogue of 6 page layouts (`server/config/layouts.ts`) seeded into a
  Firestore `layoutPlans` collection; the AI picks the best-fit layout per page.
- **Clear authored chapters.** The hand-authored `chapters/*.md` for all 19 stories will be
  cleared (character sheets in `charators/` kept) and replaced by AI-generated pages via a new
  "Generate Pages" flow, then per-page image generation.
- **Shared visibility.** Any logged-in user can view every generated storybook; only the
  owner/admin can edit or delete.

### Added (landed)
- `server/config/layouts.ts` — the 6 `PageLayout` definitions + `DEFAULT_LAYOUT_PLAN_ID` +
  `getLayoutById()`.
- `CLAUDE.md` — project overview / architecture guide for future sessions.
- `CHANGELOG.md` — this file.
- Types: `StoryTemplateDoc.layoutPlanId`, `TemplatePageDoc.layoutId` + `imageUrl`, and a new
  `LayoutPlanDoc` interface (`src/types.ts`).

### Changed (landed)
- **Shared book visibility.** `BookController` now splits access into `canReadBook` (any logged-in
  user — shared gallery) and `canModifyBook` (owner/admin only). List, get, get-pages, and export
  are read-open; create/update/delete/regenerate/layout stay owner-scoped. Characters remain
  private to their creator.

### Removed (landed) — database simplification
- **`stories` collection + `StoryStore` service.** This was a full dual-write *mirror* of the
  `books` collection (migration scaffolding for a multi-language `texts{}` model we're now
  retiring). Deleted `server/services/StoryStore.ts`, removed ~15 scattered `storyStore.*`
  dual-write/read calls across `BookController` + `QueueService`, and the startup
  `mirrorAll()`/`hydrateCache()` in `server.ts`. Book reads now come straight from the single
  `books` collection (`BookRepository`). Also removed the now-dead `StoryDoc` / `StoryPageDoc` /
  `StoryCharacterDoc` / `GenerationStatusDoc` types.
  - Orphaned `stories/*` docs may remain in Firestore; harmless (never read) and can be purged
    later.

### Added (landed) — "Generate Pages" pipeline
- **Template page generation.** `POST /api/story-library/:id/generate-pages` (admin) has the text
  model write, per page, the story text + a chosen layout (`layoutId`) + a scene illustration
  prompt + which cast appears; stored in `storyTemplates/{id}/pages` (replacing any existing
  pages). `PromptEngine.generatePagesPrompt`.
- **Per-page editor + image gen.** `GET /api/story-library/:id/pages`, `PATCH
  .../pages/:n` (edit text/prompt/layout), and `POST .../pages/:n/generate-image` — the last
  renders the page image with the **story text baked in**, composed per the chosen layout,
  conditioned on the cast reference sheets, stored in GCS at `pages/<id>/…` and reused across
  users. `PromptEngine.buildTextPageImagePrompt` (the deliberate reversal of the no-text guard;
  the old no-text path is untouched for now).
- **Layouts API.** `GET /api/layouts` serves the 6 layouts. Layouts kept as static config
  (`server/config/layouts.ts`), NOT a Firestore collection — simpler, no extra collection (removed
  the unused `LayoutPlanDoc` type). Template mutations (`regenerate-sheet`,
  `regenerate-illustration`, generate-pages, page edit, generate-image) are now `adminOnly`.
- **`TemplateStore`** gained `getPages` / `writePages` / `updatePage`.
- **Frontend:** `src/components/StoryPagesManager.tsx` — an admin modal (Generate Pages, per-page
  accordion with editable text + illustration prompt + layout dropdown, Save, Generate Image,
  image preview). Opened via a new admin-only **Manage Pages** button in `StoryLibraryBrowser`.
  Smoke-tested (mocked backend): renders, accordions open, edit fields + layout picker work.

### Changed (landed) — UI consolidation + smarter layout selection
- **One "Generate" button, inline accordion.** Replaced the two separate buttons ("Manage Pages"
  modal + "View & Manage Illustrations" legacy grid) with a single admin-only **Generate** button
  per story that expands inline (no modal) into the page list. Deleted `StoryPagesManager.tsx`
  (folded into `StoryLibraryBrowser.tsx`). Each page is its own accordion row showing the editable
  story text, editable illustration prompt, Save, and Generate Image — matching the original
  "cast → per-page accordion" design. The old per-chapter filesystem-illustration grid (legacy,
  pre-redesign) is no longer shown in the UI.
- **Layout picker removed from the UI.** The layout is chosen automatically by the AI when pages
  are generated; there is no manual override control. `layoutId` still lives on the page (used by
  `generate-image`), just not editable by the operator — keeps the editor to exactly "prompt +
  text + generate," as intended.
- **Smarter layout selection.** `PromptEngine.generatePagesPrompt` now gives the model an explicit
  "Best for" scene-fit guide per layout (e.g. layout 3 for movement/journeys, layout 5 for
  panoramic reveals, layout 6 for emotional/magical beats) and instructs it to vary layouts across
  the book rather than defaulting to one, and to phrase each `illustrationPrompt` with that
  layout's composition in mind (e.g. a diagonal-flow layout gets a scene described with movement).
- Verified end-to-end in the browser (temporarily forcing `isAdmin`, reverted immediately after —
  `git diff` on `AuthContext.tsx` confirmed clean): Generate → pages load → page accordion opens →
  no layout `<select>` present → Save → Generate Image → image renders. No console errors.

### Fixed (landed)
- **Alice's story: 3 textless chapters.** `chapters/1.md`, `2.md`, `3.md` were in the legacy
  bare-illustration-prompt format (no `Story:` line), so a book created from Alice's story today
  produced 3 pages with empty narrative text at the very beginning, inconsistent with the rest of
  the book. Added matching `Story:` text to all three (converted to the labeled format used by
  chapter 4+), verified via a quick script: cast includes `alice` ✓, all 3 chapters now have text
  (~350–360 chars, in line with neighboring chapters) ✓.

### Added (landed) — protagonist cast audit + real reference portraits
- Audited all 19 stories: 6 already had their fixed protagonist correctly in the cast (Alice,
  Ugly Duckling, Happy Prince, Velveteen Rabbit, Buck, Wind in the Willows ensemble). The other
  10 use the `MAIN_CHARACTER` personalization placeholder in their chapters (no fixed protagonist
  originally). Per owner correction, added each as a REAL cast member — same as Baloo/Bagheera/
  Shere Khan/Mother Wolf — with both a description (`charators/<key>.md`) and a generated
  reference PNG (`charators/<key>.png`, via `GeminiProvider.generateImage`, one-shot script, all
  10 succeeded first try): Mowgli (Jungle Book), Little Red Riding Hood, Thumbelina, Robinson
  Crusoe, Rebecca (Sunnybrook Farm), Pollyanna, Mary (Secret Garden), Jo (Little Women), Jim
  (Treasure Island), Sara (A Little Princess). Verified each PNG is a real, correctly-sized image
  and all 10 resolve via cast lookup. Also added a missing `onError` fallback on the cast pill
  thumbnail (harmless now that images exist, but a reasonable safety net for future imageless
  entries). Note: only a single reference photo was generated per character (matching how
  Baloo/Bagheera's base reference works) — the richer multi-view DISPLAY sheet remains an
  optional, separate, on-demand action via the existing "Generate multi-view sheet" button.

### Still to do (this redesign)
- **Wire book creation to the new pipeline (biggest remaining gap).** `QueueService.executeImageJob`
  still generates each user's book on-the-fly from legacy `chapters/*.md` prompts + the no-text
  guard; it never reads `storyTemplates/{id}/pages/{n}.imageUrl`. Until this is rewired, the
  "Generate" panel's output isn't what users actually see when they create a book.
- Clear authored `chapters/*.md` for all 19 stories (destructive — pending owner OK after review;
  the stale `pages` mirror of them was already cleared from Firestore this round).
- Retire HTML text-overlay / drag layout editor / language switcher in Book Preview + PDF, once
  book creation reads from the new pre-generated template page images.

## Prior work (pre-changelog, summarised)
- Firebase Auth (Google + email/password), per-user data scoping, admin-gated System Settings.
- Firestore data model: `storyTemplates/{id}` (+ `pages`, `characters`) and `stories/{id}`
  (+ `pages`, `characters`, `generation`) mirroring the legacy `books`; images in a private GCS
  bucket streamed via `/api/images/*`; hosted on Cloud Run (project `storygen-6e3af`).
- Story Library as the home; 19 classic public-domain stories seeded from `server/stories/`.
- Flippable parchment Book Preview (square 1:1 pages, lone cover/end, drag-to-reposition text —
  the latter to be retired by this redesign).
- Square-page PDF export.
