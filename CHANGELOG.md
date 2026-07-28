# Changelog

All notable changes to StoryGen are recorded here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/). Newest entries at the top.

## [Unreleased]

### Changed — cover is now a flat illustration, not a 3D book photo
- `PromptEngine.buildCoverImagePrompt` was telling the model to make a "picture-book FRONT COVER" /
  "published book's cover", which it took literally — rendering a photo of a physical hardback with
  a spine, binding and page edges. Rewrote the prompt to ask for a single FLAT square illustration
  exactly like an interior story page, with the title lettered onto the art, and added an explicit
  block forbidding any physical-book depiction (spine, binding, page edges, 3D mock-up, book-edge
  borders). The title, hero-priority and full-bleed rules are unchanged. Regenerate existing covers
  to pick up the new look.

### Fixed — PDF export ignored the generated cover image
- `PDFExportDialog`'s PDF cover page was hand-drawn with jsPDF (a brown rectangle + bordered frame
  + title text) and never looked at `book.coverImageUrl` — so a book with a real AI-generated cover
  still exported the old placeholder. Now the cover page draws the actual generated cover image
  full-bleed (0,0 to the full square canvas, no border), matching how page images are already drawn.
  The hand-drawn version is kept only as `drawCoverPlaceholder()`, used as a fallback for books
  whose cover hasn't been generated yet. The cover is still always page 1 of the exported PDF.

### Added — on-demand AI front covers for books
- A book can now get a real illustrated FRONT COVER (square 1:1, same canvas as the pages),
  replacing the CSS gradient/emoji placeholder. The cover stars the book's main character
  (conditioned on the hero's reference sheet so it matches the interior art) and bakes the story
  title into the image. For a personalized book the title is personalized too — e.g. "Alice's
  Adventures in Wonderland" → "Emma's Adventures in Wonderland" (via `personalizeStoryText`, so it
  only changes when the title actually contains the protagonist's name).
- User-triggered, not automatic: a **"Generate Cover"** button on the cover placeholder in
  `BookPreview` (with a live "Designing cover…" state and a "Regenerate" affordance once done).
  `POST /api/books/:id/generate-cover` (`BookController.generateBookCover`) queues the render;
  `App.tsx` optimistically flips the status and the poll loop shows the finished image.
- **Per-story cover prompts** (`server/config/coverPrompts.ts`): each of the 20 stories has a
  hand-written iconic cover scene (hero + signature setting/mood), used as the cover's scene hint
  so it composes the RIGHT recognizable scene rather than guessing from a random interior page.
  Combined with the per-style prompt fragment, each art style renders that scene distinctly.
- **Per-story cover headings** (`server/config/coverTitles.ts`): each story has a `default` heading
  (always including the story name) plus an optional `personalized` template. Fixes the broken
  heading where running a name-only title ("Thumbelina", "Pollyanna") through the name-swap left the
  cover reading just the child's name ("Emma", "Sophia"). Now the child's name is used only where it
  still reads as that story ("Emma's Adventures in Wonderland", "Erik and the Beanstalk"); otherwise
  the plain default title is shown.
- The generated cover now appears **everywhere a book is shown** — the My Books cards and the
  Dashboard "Recent Book Projects" cards render `book.coverImageUrl` when ready (falling back to the
  gradient placeholder otherwise), in addition to the book/grid preview.
- Rendering mirrors the page pipeline:
  - Generic (non-personalized) books reuse a template-cached cover per style, stored on
    `storyTemplates/{id}` (`coverImageUrl`/`coverImageUrls`) — no repeat spend across generic books.
  - Personalized books render a fresh cover per book (child as hero, personalized title), stored
    on `book.coverImageUrl`.
- New `JobType.COVER` + `QueueService.executeCoverJob`, `PromptEngine.buildCoverImagePrompt`,
  `StoryLibraryController.generateCoverImageForStory`/`ensureCoverImage` (+ a
  `POST /api/story-library/:id/generate-cover` route to (re)tune a template cover per style), and
  `TemplateStore.setCoverImage`/`getCoverImage`. Frontend cover shown full-bleed in both book and
  grid views once ready.

### Added — new story: Jack and the Beanstalk (boy hero, 14 pages)
- New `server/stories/t3-jack-and-the-beanstalk/` (t3 was the one free slot in the numbering):
  14 chapters, `tags.txt`, and a 7-member cast (jack, mother, the giant, milky white, old man,
  golden hen, magic harp). Chosen for a ~5-year-old boy to star in — public domain, a young boy
  protagonist, and a simple 14-beat arc. The giant is written and described as comically large
  and grumpy rather than menacing, both for age-appropriateness and to reduce the risk of the
  Gemini image-safety blocks seen with child + threatening-character scenes.
- Registered `jack` as the story's protagonist in `server/config/protagonists.ts` so a child
  starring in it gets the name/reference substitution, and added the cast to
  `server/scripts/generate-casts.ts`.

### Added — sync mechanism for brand-new stories (`TemplateStore.syncMissingStories`)
- Adding a story folder to disk previously had no way to reach Firestore: `seedFromFilesystem`
  only runs when the whole `storyTemplates` collection is empty, and `syncMissingCharacters` only
  tops up an EXISTING story's cast — so a new story simply never appeared in the Story Library
  (which reads the Firestore-backed cache). `syncMissingStories()` creates the template doc +
  characters subcollection for any filesystem story missing from Firestore, mirroring the
  existing sync pattern. `sync-story-characters.ts` now runs it before the per-story cast pass,
  so one command covers both new stories and new cast members.

### Changed — surface the real reason when page generation fails
- "Generate Pages" / "Regenerate all pages" showed a hardcoded "Page generation failed. Check the
  text provider…" regardless of the actual cause, hiding the common one (Gemini quota/credits
  exhausted — page generation is a text call on the same API key). The frontend now shows the
  backend's real error, and `GeminiProvider.generateText` translates a raw `RESOURCE_EXHAUSTED`/429
  blob into a plain "quota/credits exhausted — top up billing at ai.studio/projects" message.

### Fixed — a personalized book's STORED text still named the original protagonist
- Follow-up to the protagonist fix below: the name substitution was only applied to the image
  prompt at render time, so the text stored on the book still read "…named Thumbelina" — meaning
  Book Preview, the page editor and the exported PDF all still showed the original protagonist's
  name even when the illustrations featured the child. Confirmed on a real personalized book
  (characterId + childName "Emma" set correctly, stored page 1 text still "…named Thumbelina").
- Personalization now happens at BOOK CREATION time in `BookController.createBookFromLibrary`, so
  the stored book text and illustration prompts feature the child everywhere. Extracted the
  substitution into a shared `personalizeStoryText`/`getProtagonistName` helper used by both
  creation and the render path (where it is now a no-op for new books, and repairs books created
  before this change). Dry-run verified across all 14 Thumbelina pages: 0 remaining mentions.

### Fixed — personalized books kept the original protagonist instead of the child (root cause)
- Reported repeatedly as "it still generates the default character and the name still says
  Thumbelina". Root cause (confirmed against stored data): the REDESIGN "Generate Pages" pipeline
  has the text model author each page with the protagonist's REAL name and appearance baked in
  ("…so she was called Thumbelina"; "tiny Thumbelina, a sweet girl with blonde hair") and lists
  the protagonist in `characterKeys` — there is no MAIN_CHARACTER token to substitute, so the
  existing `.replace(/MAIN_CHARACTER/…)` did nothing, and the personalized render was even sent
  the ORIGINAL protagonist's reference image as a competing input. The child never appeared.
- Added `server/config/protagonists.ts` mapping each single-protagonist story to its cast key.
  `QueueService.executeImageJob`'s personalized branch now (a) drops the protagonist's own
  reference image so the child's photo/sheet is the only hero reference, and (b) swaps the
  protagonist's name for the child's throughout the story text and scene prompt. Verified against
  real Thumbelina data: name → child's name, protagonist reference dropped.
- Known residual: template illustration prompts still contain the protagonist's baked-in
  appearance adjectives (e.g. "blonde hair"); with the original reference dropped and the child's
  photo as the sole hero reference the child should dominate, but fully removing the baked-in
  description requires regenerating the templates with a protagonist-role-only prompt (a separate,
  credit-costing step). Ensemble/no-child stories (Aesop's Fables, Swiss Family Robinson, Wind in
  the Willows, The Happy Prince) are intentionally not mapped and use their authored cast as-is.

### Added — personalized books now respect the selected art style; hero prioritized over cast refs
- Personalized ("Create This Storybook") books previously always rendered the hero's sheet and
  every page in the default style, regardless of any style picked in the Story Library — there
  was no `styleId` anywhere in the book-creation path. Added a `styleId` field to `Book`, an art-
  style dropdown to both book-creation flows (direct library + wizard step 3), and threaded the
  resolved style into `QueueService.executeImageJob`'s personalized branch (page prompt + which
  style's cast reference images to use) and into hero-sheet rendering.
- When a book uses a non-default style, the hero's reference sheet is re-rendered in that style
  once at book-creation time (`QueueService.generateHeroReferenceSheet`, extracted from the
  existing character-creation job) and stored on the BOOK (`heroStyledSheetUrl`) rather than
  overwriting the Character's own shared default-style sheet — so the same character can star in
  different books rendered in different styles without clobbering each other.
- Fixed a related bug in the same code path: a generic (non-personalized) book only ever checked
  the template page's legacy singular `imageUrl` (the default style's cache) when deciding whether
  to reuse a cached image, so requesting a non-default style always re-rendered from scratch
  instead of reusing that style's already-cached page. Now checks `imageUrls[styleId]` for
  non-default styles.
- Diagnosed a separate reported issue ("the hero comes out generic on some pages of a personalized
  book") as a real but different problem: pages that also reference another story character send
  BOTH the hero's and that character's reference photos to Gemini in the same call, and the model
  doesn't reliably prioritize between them. `buildTextPageImagePrompt` now takes an optional hero
  name + reference count and explicitly tells the model which leading reference images are the
  hero (preserve exactly) vs. secondary cast (identity only, must not influence the hero).

### Fixed — non-default art styles were dominated by the reference image's own rendering
- Reported as "Ghibli looks the same as Vintage Watercolor" — confirmed live: reference-conditioned
  generation was copying the reference photo's own texture/linework/palette over the requested
  style, worst on Ghibli (also a painted look, so it got swallowed almost entirely) but present to
  a lesser degree on every non-default style. `ArtStyle` gained an `avoidFragment` naming the exact
  medium each style must NOT come out looking like, and `PromptEngine` now appends an explicit
  "reference is for IDENTITY ONLY — discard its rendering technique" directive to every prompt that
  combines a reference image with a non-default style (cast reference generation, display sheets,
  page images). Consolidated the cast-reference prompt (previously inlined in
  `StoryLibraryController`) into `PromptEngine.generateStyledCastReferencePrompt`.
- Purged every non-default-style image generated before this fix (69 GCS objects, 24 Firestore
  `imageUrls`/`displaySheetImageUrls` entries, across every story that had any) so the next
  "Generate cast in this style" click regenerates fresh under the corrected prompt instead of
  serving the old weakly-styled art forever. Vintage Watercolor and all story text/layout/
  illustration-prompt data were untouched.

### Fixed — path traversal on the public cast-image route
- `GET /api/story-library/:id/characters/:key/image` sits outside the auth gate and joined the
  URL's `:id` straight into a filesystem path. Express decodes percent-encoding AFTER routing, so
  a request for `%2E%2E%2F%2E%2E%2F%2E%2E%2Fserver` escaped `server/stories/` — verified live,
  returning a 500 whose body leaked the absolute host path. `StoryLibraryService` now resolves
  every story id through a `storyDir()` helper that rejects anything landing outside the stories
  root (containment check on the RESOLVED path, so `..`, absolute paths and Windows drive-relative
  ids are all covered), and `findSubdir` treats a missing directory as "no such story" instead of
  throwing an ENOENT that surfaced as a path-leaking 500. Re-verified after the fix: traversal
  attempts 404, legitimate stories/styles still 200.

### Fixed — unvalidated styleId was used for storage paths and Firestore keys
- `regenerateCastSheet` resolved the requested style through `getStyle()` (which falls back to the
  default for an unknown id) but then used the RAW request value to build the GCS object path and
  the Firestore map key. A typo'd style silently filed default-style art under a nonexistent style
  name, and a caller could steer writes to arbitrary object paths / map keys. All write paths now
  use the resolved `style.id`; the read paths (`getCharacterDetail`, `getCharacterImage`) and the
  `generate-image` response now normalize through `getStyle()` too, so the id the client keys its
  cache by always matches what the backend stored under. Verified a known-but-ungenerated style
  still 404s (the UI's "generate cast for this style" affordance depends on it).

### Fixed — per-style image URLs were written to a literal dotted field name
- `setPageImage`/`setCharacterDisplaySheet` wrote `{ "imageUrls.<styleId>": url }` through
  `set(..., { merge: true })`. Firestore only parses dot notation as a field path in `update()` —
  in `set()` a dotted key is a literal field NAME, so the data landed in a field called
  `"imageUrls.pixar-3d"` instead of inside the `imageUrls` map. Generation appeared to work (the
  in-memory cache was updated correctly) but every server restart reloaded from Firestore and the
  images vanished from the UI. Both writers now build the full merged map and write it as a real
  nested object; a one-off repair moved the already-orphaned fields back into place (24 pages on
  Alice) and was then removed.

### Added — multiple art styles for the Story Library
- Replaced the single hardcoded `HOUSE_STYLE` constant with a style catalogue
  (`server/config/styles.ts`): Vintage Watercolor (the original art), Pixar-Inspired 3D,
  Claymation, and Studio Ghibli-Inspired Fantasy. `PromptEngine` now takes the style as a
  parameter rather than importing a constant, so character sheets, cast references and page
  images all render in the selected style.
- Storage is namespaced per style (`casts/<storyId>/<styleId>/<key>.*`,
  `pages/<storyId>/<styleId>/<n>.*`), with the default style also resolving the original flat
  `casts/<storyId>/<key>.*` layout — so no pre-existing artwork had to be moved or regenerated.
- New styles are generated lazily per story (`POST /story-library/:id/styles/:styleId/generate-cast`),
  conditioned on that character's default-style reference so identity carries across styles and
  only the rendering changes. A story's text, layout and illustration prompt are style-independent
  and are never regenerated when switching styles.
- Story Library gains an art-style dropdown (persisted to localStorage, guarded so a storage
  failure can't take the page down); each style's rendered page images are stored separately, so
  switching styles never overwrites another style's art.

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
