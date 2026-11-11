# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Solid skills

Solid 2 is neither Solid 1.x nor React. Its agent skills ship inside the installed packages,
versioned with them; read the matching one before changing code:

- `node_modules/solid-js/skills/solid-2.0/SKILL.md` — the primer; read it before writing any
  Solid code.
- `node_modules/solid-js/skills/solid-2.0-cheatsheet/SKILL.md` — exact signatures, and the 1.x
  APIs that no longer exist.
- `node_modules/solid-js/skills/reactivity-diagnostics/SKILL.md` — the repair for each `[CODE]`
  diagnostic the dev server prints.
- `node_modules/@solidjs/web/skills/server-components/SKILL.md` — server components and their
  slots (the `"use server"` pages).
- `node_modules/@solidjs/diagnostics/skills/agent-loops/SKILL.md` — checking reactive code with
  evidence instead of reading it.

## What this is

Personal CV website for Christoph Stach (christophstach.de), built with **Solid 2** (release
candidate: `solid-js`, `@solidjs/web`, `@solidjs/router` pinned to exact `rc`/`next`
versions) in the SSR start mode of `@solidjs/vite-plugin`, with **Nitro 3** (`nitro/vite`)
as the Vercel adapter. The public pages are server-rendered per request; their data and the CV
PDF are cached with ISR. The private `/desk` area is server-rendered behind GitHub auth. CV
content (entries, bullets, skills, projects) and the CVs, which pick from it for
`/curriculum` and the printed CV, live in Postgres (Neon), accessed with Drizzle ORM and
edited in the desk. Styling is a hand-rolled pure-CSS design system.

## Commands

Package manager is **pnpm**; the Node version is pinned in `.node-version`. See `package.json`
for the script list.

There is no test suite. `pnpm build` is the deploy build: Vite builds the client and the SSR
handler, Nitro wraps them into `.vercel/output`. On Vercel the `vercel-build` script runs
`drizzle-kit migrate`, then `vite build`.

Database: the schema is `server/db/schema.ts`; after changing it run `pnpm db:generate` and
commit the SQL migration in `server/db/migrations`. `pnpm db:migrate` applies migrations to
`DATABASE_URL_UNPOOLED` (or `DATABASE_URL`). Data changes that must ship with the code are
custom migrations (`drizzle-kit generate --custom`).

Tooling is **TypeScript 7** (`tsc`, strict plus `noUncheckedIndexedAccess`,
`exactOptionalPropertyTypes`), **oxlint** (type-aware, via `oxlint-tsgolint`;
`oxlint.config.ts`) and **oxfmt** (`oxfmt.config.ts`). No `any` and no unchecked `as` casts: input from
outside (request bodies, server function arguments, query strings, fetched JSON, env) is parsed
with **zod/mini** schemas.

Environment variables are declared and validated in `env.ts` (read at server start, imported
from `virtual:solid-env/server`); `.env.example` lists them.

## Branches and commits

- Work happens on a branch off `main`, named by type: `feat/…`, `fix/…`, `refactor/…`,
  `chore/…`, `docs/…` (e.g. `feat/cover-letter-export`).
- Commit messages follow Conventional Commits: `type(scope): summary`, imperative, e.g.
  `feat(desk): add a CV section` or `fix(cv): keep the PDF on two pages`.
- Every commit is atomic: it does exactly one thing, and on its own it builds and passes
  `pnpm lint` and `pnpm typecheck`. Split unrelated changes into separate commits.
- lefthook (`lefthook.yml`, installed by `pnpm install`) enforces this: pre-commit refuses
  `.env` files and runs secretlint (`.secretlintrc.json`), oxlint and oxfmt on the staged
  files; commit-msg checks the Conventional Commits header; pre-push runs `pnpm typecheck` and
  `pnpm build`. Never bypass them with `--no-verify`; fix the finding instead. A new secret env
  variable goes into the pattern rule in `.secretlintrc.json`.

## Architecture

**Routing is file-based**: `src/routes/` (via `filesystem-routing` and
`@solidjs/router/fs`). `src/routes/(site)/` holds the public pages under the `(site).tsx`
layout (header, footer, head tags); `src/routes/desk/(shell)/` holds the desk pages under the
`(shell).tsx` layout (sidebar); the print pages (`/cv-print`, `/desk/cv-print/<id>`,
`/desk/cover-letter-print/<id>`) sit outside both. A route module with `GET` exports and no
default export is an endpoint (`src/routes/api/…`, `/christoph-stach-cv.pdf`,
`/auth/github`). Links use the router's typed `paths` (`src/router.ts`; a node ends in a
string with a call, `paths.desk.cvs(id)()`, and an empty query value is dropped, so flags are
`{ new: "1" }`); URLs that aren't pages are constants in `src/data/endpoints.ts`. Never write a
page path by hand.

**Server pages and server functions.** `/` and `/curriculum` are `"use server"` default
exports (`fileRoutes({ serverComponents: true })`): rendered on the server, their code never
reaches the browser; only the client shell (router, header, theme toggle) hydrates. Their head
tags can't come from a server component, so `(site).tsx` renders them from a per-path table.
Data the app reads goes through `query()`s whose bodies are `"use server"` (`src/lib/desk/…`,
`src/lib/cv-print.ts`); writes are plain `"use server"` functions. Two rules keep the client
build working: server-only modules (`src/server/**`, marked `import "server-only"`) are
imported with `await import()` inside the `"use server"` body, never at the top of a module the
client sees; and a server page never imports `src/router.ts` (the router imports every page,
which is a cycle that hangs the build): it gets the typed paths from `routePaths()` in
`src/route-paths.ts`, which the router registers. Server function arguments travel as JSON:
leave an unset field out of an object argument instead of passing `undefined`. The router
refetches every query after any server function call, so anything that runs Chrome (page
checks) is a plain server function, not a query. Every desk server function and desk endpoint
calls `requireUser()` first (`src/server/auth.ts`); the page guard doesn't cover them. The one
exception is the scheduled page check (`/api/desk/page-checks`, `src/server/page-check-job.ts`):
Vercel Cron calls it daily and a GitHub Action (`.github/workflows/page-checks.yml`) every 15
minutes and after each production deploy, both with `CRON_SECRET`, and it seals a session only for its own Chrome
to measure every CV and letter without a page check on this build.

**Content is data, not markup.** CV content lives in the database, typed by the interfaces in
`src/data/cv.ts` (`TimelineEntry`, `EntryRecord`, `SkillGroup`, `Profile`, `CvContent`). The
profile (one row of `cv_profile`, at `/desk/content/profile`), timeline entries (`cv_entries`,
bullets as an ordered jsonb list), skill groups (`skill_groups`) and projects (`projects`) are
edited in the desk under `/desk/content/experience`, `education`, `skills` and `projects`;
`src/server/cv-content.ts` loads them (`loadCvContent`)
and writes them, `projects.ts` does the projects. Entries, bullets and skill groups carry
stable ids that can't change once created, and **CVs** pick them by id, in order.
CVs are rows in `cvs`/`cv_entry_picks`, typed by `Cv` in
`src/data/cvs.ts`, edited at `/desk/cvs/<id>`; `src/server/cvs.ts` holds their
database access. Saving a CV checks every id against the content (`printCv` in
`src/lib/cv.ts`); deleting an entry, bullet, skill group or project takes it out of
every CV. Two CVs hold a public role and can't be deleted: the primary one is the
printed CV (`/cv-print`, `/christoph-stach-cv.pdf`), the website one feeds `/curriculum`
(`/api/cv-website`). The others are private, at `/desk/cv-print/<id>` and `/api/desk/cv/<id>`.
All CVs render through the one `CvDocument.tsx`, so a CV changes content, never the
design. A CV picks layout steps (`CV_LAYOUT_STEPS` in `src/data/cv-print-layout.ts`) that
`CvDocument.tsx` turns into `--cv-space`, `--cv-scale` and its `@page` margin; "Check pages"
prints unsaved steps through `?spacing=…&textSize=…&margin=…` on `/desk/cv-print/<id>`, shown,
never stored. CV texts are plain except for links written as `[text](https://…)`, so render
them through `CvText.tsx`. Dates are ISO month strings formatted with `formatMonth`
(`src/lib/format.ts`).

**Design direction** (the look, wording and motion, and the brief for the frontend-design
skill) is in `DESIGN.md`. Read it before changing or adding UI.

**CSS design system is layered, imported once via `src/assets/css/main.css`:**

1. `fonts.css` — the two site fonts from Fontsource, static weights 400–700.
2. `tokens.css` — two tiers: _primitives_ (raw scales) and _semantic aliases_
   (`--color-text`, `--color-accent`, …). **Components must consume only semantic aliases,
   never primitives.** Dark mode overrides the semantic aliases under `.dark`.
3. `base.css` — reset / element defaults.
4. `forms.css` — form controls drawn the same on every device: `.field` (label, hint),
   `.input` (text inputs, selects, textareas) and every `<input type="checkbox">`. Controls stay
   native; don't restyle them per component.
5. `components.css` — shared global classes (`.button`, `.chip`, `.icon-button`, `.panel`,
   `.section-label`, `.text-link`, …). Reuse these before inventing new styles.
6. `utilities.css` — layout helpers (`.container`).

Per-component styling is a CSS Module next to the component (`Name.module.css`, desk pages in
`src/components/desk/page-*.module.css`); global classes are written as plain strings, module
classes through `styles.x` or `styles["x--y"]`. Don't mix them up: a global class name used
through `styles` is `undefined`, a module class written as a string never matches.

**Dark mode** is a `color-mode` cookie (`light`/`dark`/`system`, `src/lib/color-mode.ts`).
The server reads it and renders `<html class="dark">` for `dark`; for `system` (or no cookie) a
tiny blocking script in the head (`src/color-mode-script.ts`) checks `prefers-color-scheme`.
`ThemeToggle.tsx` cycles system → light → dark and writes the cookie.

**Icons** are Tabler SVG paths inlined as components in `src/components/icons.tsx`; no icon
runtime ships.

**Caching and route rules** live in `nitro({ routeRules })` in `vite.config.ts`: ISR on
`/api/cv-home`, `/api/cv-website` and `/christoph-stach-cv.pdf`; `X-Robots-Tag` on `/cv-print`,
`/desk/**` and `/login`; `/about-me` 301-redirects to `/`; `maxDuration: 60` for the PDF. When
the desk changes content, `revalidatePaths` (`src/server/cv-pdf.ts`, paths from
`src/server/cv-public-paths.ts`) renews those caches with `ISR_BYPASS_TOKEN`. Add new public
pages to `public/sitemap.xml` too (hand-maintained).

**Desk and auth.** GitHub OAuth (`src/routes/auth/github.ts`, with a `state` cookie) creates a
session only for `DESK_GITHUB_USER_ID`. The session is h3's sealed cookie, from `nitro/h3`
(`src/server/session.ts`; `SESSION_SECRET` comma-separated, newest seals). `src/middleware.ts`
redirects anonymous `/desk/**` requests to `/login`, before anything renders. Sidebar sections
are data in `src/data/desk.ts`. Desk reads are queries in `src/lib/desk/queries.ts` (keys
`desk-cvs`, `desk-applications`, `desk-cover-letters`, `desk-cv-content`, `desk-projects`, `desk-profile`,
`desk-user`). Editors keep their form in `useDraft` (`src/lib/desk/draft.ts`): a store that
follows the stored value, reconciled by id, compared by content so refetches don't reset
typing; it asks before leaving with unsaved changes. Change store arrays in place (`setItems` in
`src/lib/desk/picks.ts`) and key lists by a stable field. Shared desk components:
`DeskTable` (overview lists: search, filters, sorting, opt-in reorder), `DeskFormSection`,
`DeskSaveBar`, `DeskMenu`, `DeskLinkRows`, `DeskCvRows` (a CV's picks).

**Applications** are private to the desk (`applications`, `src/server/applications.ts`, edited
at `/desk/applications/<id>`): the job, its status and next step, contacts and history (jsonb
lists, ids unique within the application), and the CV sent with it. Status and source are the
fixed lists in `src/data/applications.ts`; `src/lib/application.ts` says when a next step is due.
An application has at most one cover letter (unique `cover_letters.application_id`), and
deleting it deletes the letter. "Mark as sent" freezes the CV and letter as they print then
into `applications.sent` (`src/server/sent-copies.ts`; the copy keeps a list of letters, at most
one); it's read through the zod schema in `src/data/sent-copy.ts`, since the renderers may
change after it was stored, and printed from `/desk/sent-print/<id>` and `/desk/sent-print/<id>/<letter>`.

**Cover letters** are private to the desk, each the one letter of an application (`cover_letters`,
`src/server/cover-letters.ts`, edited at `/desk/cover-letters/<id>`). Name and contact come
from the profile, the role under the name from the application's CV or else the profile; the
job (the subject's default wording names it) is the application's too.
`CoverLetterDocument.tsx` is printed from `/desk/cover-letter-print/<id>` and shown live in the
editor; it shares `CvHead.tsx` and the `.cv-paper` palette with the CV. A letter has one fixed
layout (`COVER_LETTER_MARGIN_MM`), and its page check flags more than one page. Language
(`en`/`de`) sets the date format and the default wording (`COVER_LETTER_WORDING`).

**SEO/meta** (canonical, OG/Twitter tags, `og:locale`, the JSON-LD `Person`) is `SiteMeta` in
`src/seo.tsx`; the public titles are in `src/routes/(site).tsx`, desk titles come from
`DeskMeta`.

## Gotchas

- Solid 2, its router and the Vite plugin are pre-releases: APIs differ from older docs. Check
  names against `node_modules/solid-js/CHEATSHEET.md`, and fix every Solid diagnostic the dev
  server prints (`[CODE]` lines; repairs in the `reactivity-diagnostics` skill).
- `file-routes.d.ts` and `solid-env.d.ts` are generated by the dev server and the build, and
  committed; run one of them after adding a route or env variable, before `pnpm typecheck`.
- The plugin's dev CSS inlining treats `` $` `` in a stylesheet as a replace pattern; don't
  write that sequence in CSS comments.
- pnpm enforces a minimum release age; `pnpm-workspace.yaml` lists the deliberate exceptions.
- The Open Graph social card (`public/images/og.png`, 1200×630) is generated from the
  `tools/og-card.html` template, not hand-painted. Regenerate after editing the template with:
  `google-chrome --headless=new --hide-scrollbars --window-size=1200,630 --screenshot=public/images/og.png tools/og-card.html`
- The downloadable CV (`/christoph-stach-cv.pdf`) is not a file in the repo. Its route prints
  the `/cv-print` page through `src/server/cv-pdf.ts` (one Chrome at a time per instance) with
  `puppeteer-core` (`@sparticuz/chromium`, or the Chrome in `CV_PDF_CHROME_PATH` off Linux), and
  ISR caches it. Page breaks are CSS rules in `CvDocument.module.css`; don't tune the spacing to
  move a break (a CV fills its pages with its layout steps). The CV editor shows how
  full each page is (`src/server/desk-cvs.ts`, `DeskCvPdf.tsx`, rules in
  `src/lib/cv-layout.ts`); the result is stored as `page_fills` with the `BUILD_ID` that made
  it, and after a deploy the desk shell re-checks every CV in the background
  (`src/lib/desk/page-checks.ts`). The serverless Chromium has no system fonts, so the PDF must
  only use the site's own fonts.
- `public/images/hero.png` is a crawler-facing copy of `public/images/hero.webp` for the
  JSON-LD `Person.image`. Keep the two in sync.
