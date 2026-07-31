# StoryGen — project guide

AI app that turns a child's photo into a personalized illustrated storybook. Pet project used
only by the owner and his mentor.

> **Keep `CHANGELOG.md` updated.** Whenever you make a meaningful change, add an entry under
> `## [Unreleased]` in `CHANGELOG.md` (newest at top). This is a project rule.

## Stack

- **Frontend:** React 19 + Vite + Tailwind (TypeScript). Entry `src/main.tsx` → `src/App.tsx`.
- **Backend:** Express (TypeScript). Dev runs via `tsx server.ts`; prod is an esbuild bundle
  (`dist/server.cjs`). Single Cloud Run container serves the API + built frontend.
- **Auth:** Firebase Authentication (Google + email/password). Client `src/firebase.ts` +
  `src/auth/AuthContext.tsx` attach a Bearer token to every `/api/` call; backend verifies via
  `firebase-admin` in `server/middleware/auth.ts` (`authProtect`, `adminOnly`). Admin emails
  default to `savindueshan2004@gmail.com` (env `ADMIN_EMAILS`).
- **Data:** Firestore (via `server/database/`), accessed through an in-memory cache + granular
  writes. On Cloud Run, credentials come from the service account (ADC) — no key file shipped.
- **Images:** private Google Cloud Storage bucket `storygen-6e3af-images`; served by streaming
  through `/api/images/*` (these routes are intentionally public — an `<img>` can't send a
  token). Project `storygen-6e3af`.
- **AI:** Gemini image model (reference-conditioned generation in
  `server/providers/GeminiProvider.ts`); OpenAI optional. Prompts built in
  `server/providers/PromptEngine.ts`.

## Data model (two coexisting layers)

- **Story templates** — the 35 shared stories: 15 classic public-domain adaptations plus 20
  original values-based stories (kindness, honesty, growth mindset, family, feelings).
  The originals are hand-authored: do NOT run "Generate"/"Regenerate all pages" on them, as that
  overwrites a story's pages with freshly AI-generated text. Per-page "Generate Image" is safe.
  - Filesystem seed: `server/stories/<id>/` with `chapters/N.md` (illustration prompt +
    `Charators:` line), `charators/<key>.png|.md` (character sheets + description prompts),
    `illustrations/N.*` (cached art), `tags.txt`. Parsed by
    `server/services/StoryLibraryService.ts`.
  - Firestore mirror: `storyTemplates/{id}` + `pages/{n}` + `characters/{key}`, managed by
    `server/services/TemplateStore.ts`.
- **Generated books** — a user's storybook. Single source of truth: the `books` Firestore
  collection (`BookRepository`). (The earlier `stories`/`StoryStore` dual-write mirror was removed
  as unnecessary duplication.)
- **Layouts:** Firestore `layoutPlans/{planId}` + `layoutPlans/{planId}/layouts/{layoutId}`
  (`server/services/LayoutPlanStore.ts`), mirroring the `storyTemplates` pattern exactly (seed
  once from `server/config/layouts.ts` when empty, in-memory cache, static config as fallback if
  Firestore is empty/unreachable). Editing a layout's prompt is now a Firestore edit, not a code
  deploy. `storyTemplate.layoutPlanId` records which plan was used; each generated page records
  its chosen `layoutId`. Served read-only via `GET /api/layouts`.

## Key flows

- **Create character:** upload a photo → AI derives appearance → photo-conditioned character
  sheet (background job in `server/services/QueueService.ts`).
- **Story Library** (home) is the only source of generatable stories. The child stars as the
  hero; the story's own cast (from `charators/`) conditions each illustration.
- **Book Preview** (`src/components/BookPreview.tsx`): flippable parchment book, square 1:1
  pages, lone cover/end. **PDF export** (`src/components/PDFExportDialog.tsx`): square pages.
- **Background jobs:** `QueueService` (max 2 concurrent, retries) handles character sheets,
  story text, image, and PDF jobs. `tsx` does NOT auto-restart on backend edits — restart the
  dev server after server-side changes.

## Access rules

- Any logged-in user may **view, edit, delete, and regenerate** any generated book — this is a
  shared gallery for the owner + mentor, not multi-tenant; `Book.ownerId` is still recorded for
  attribution but no longer gates actions (`BookController.canModifyBook`).
- Story-template editing (Generate Pages, per-page text/prompt edits, image generation) is open
  to **any signed-in user** — templates are shared/collaborative, not owned by whoever generated
  them first.
- `ADMIN_EMAILS` still gates System Settings (shared API keys) only — the one thing that stays
  admin-restricted.

## Running & deploying

- Dev: `npm run dev` (serves API + Vite; port 3000). Frontend-only build check: `npx vite build`.
  Typecheck: `npx tsc --noEmit`.
- Deploy (from this dir, in cmd.exe where gcloud is on PATH):
  `gcloud run deploy storygen --source . --project storygen-6e3af --region <region> --allow-unauthenticated`
  Cloud Run's service account supplies Firestore + GCS auth automatically.
- Git repo root is this `story-gen/` folder (not the parent `Storygen/`). Branch:
  `feature/photo-personalization-and-progress`.

## Conventions

- Match surrounding code style; keep comments at the existing density.
- Firestore rejects `undefined` — round-trip through JSON (`clean()`), keep `null` for "unset".
- Dual-write mutations are wrapped non-fatally (`.catch(() => {})`) so a mirror failure never
  breaks the primary flow.
- Verify UI changes on localhost; the sandboxed headless browser here has a 0×0 viewport and
  freezes CSS transitions (see notes when driving it programmatically).

## In-progress redesign

See `CHANGELOG.md` `[Unreleased]`: images become the pages (story text baked into each image via
a chosen layout), pages pre-generated once per template and reused, authored chapters cleared,
HTML text-overlay retired.

**Important gap:** "Create This Storybook" (`QueueService.executeImageJob`) does NOT read from
the new `storyTemplates/{id}/pages/{n}.imageUrl` yet — it still generates each user's book
on-the-fly from the legacy `chapters/*.md` prompts with the no-text-in-image guard. Until this is
rewired, admin-generated template page images (via the "Generate" panel) are for review/refinement
only and are not what a user sees when they create a book from that story.
