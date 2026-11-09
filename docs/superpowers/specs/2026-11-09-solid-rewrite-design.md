# Rewrite on Solid 2: design

Branch: `solid-rewrite`. Date: 2026-11-09.

## Intent

Christoph wants to stop writing Vue single-file components. Two reasons, in his words: no more
Vue template syntax, TSX instead; and no virtual DOM. Solid 2 gives both: TSX compiled to
fine-grained DOM updates driven by signals.

This is a **technology swap, not a redesign**. A visitor, a crawler, a recruiter downloading
the PDF and Christoph working in the desk should not be able to tell that anything changed,
except that it is built differently underneath.

## Goals

- The whole site runs on **Solid 2** (`solid-js@2` RC, `@solidjs/web`, `@solidjs/router@2`
  next) in the **SSR start mode of `@solidjs/vite-plugin`** (as in the official
  `solidjs/templates/solid-v2/fullstack` template): streaming SSR, `'use server'` functions,
  `start.middleware`, API routes through `filesystem-routing`, typed env via `env.ts`.
- Everything moves in one go (Christoph's choice): public pages, `/cv-print`, the desk with
  GitHub login, CV content and variants, cover letters, the CV and cover-letter PDFs, the
  page checks, ISR with on-demand revalidation, the `/about-me` redirect, the error page.
- Same URLs, same HTML semantics and SEO metadata (canonical, OG/Twitter, `og:locale`, JSON-LD
  `Person`), same look in light and dark, same PDF output.
- Same database: `server/db/schema.ts` and every migration in `server/db/migrations` stay as
  they are; the live Neon database is used unchanged.
- Deploys to Vercel, with ISR on the public data endpoints (`/api/cv-home`,
  `/api/cv-website`) and `/christoph-stach-cv.pdf`; `/` and `/curriculum` render per request
  (see "Data, caching and revalidation").
- The Solid 2 agent skills are wired in as Solid recommends (done, see below), and the code
  follows them.

## Non-goals

- No visual redesign, no new features, no content changes, no schema changes.
- No test suite beyond what already exists (none). Verification is described below.
- No SolidStart (Christoph's choice), no Solid 1.x.

## Anti-goals (a failure even if it "works")

- `/` or `/curriculum` hydrating as a whole. Today they ship no Vue (`noScripts`); afterwards
  only what replaces today's hand-written JavaScript may run on them as Solid (see "Public
  pages and JavaScript").
- A printed CV that differs from today's: different page breaks, Type3 fonts, missing links,
  or fonts the serverless Chromium doesn't have.
- The desk reachable without the configured GitHub account, or any `/api/desk/*` (or its
  server-function equivalent) callable without a session.
- Solid 1.x or React patterns: destructured props, one-argument `createEffect`,
  `createResource`, `onMount`, `<Suspense>`, `solid-js/web` imports. The primer skill lists
  them.
- Data loss or a migration run against Neon as part of the rewrite.

## Decided

| Topic | Decision | Whose |
| --- | --- | --- |
| Framework | Solid 2 RC, not SolidStart, not Solid 1.9 | Christoph |
| Server/SSR | `@solidjs/vite-plugin` start mode (`ssr: true`) | Christoph |
| Scope | everything at once, on `solid-rewrite` | Christoph |
| Agent skills | `@tanstack/intent` scans `node_modules`; `package.json#intent.skills = ["solid-js", "@solidjs/*"]`; guidance block in `CLAUDE.md` | Christoph asked for Solid's recommended way |
| Deploy adapter | `nitro/vite` (Nitro 3) as the provider plugin, Vercel preset, ISR through its `routeRules` | my call, following the plugin's deployment contract |
| Env var names | renamed without the `NUXT_` prefix, see "Environment variables" | Christoph |
| Versions | exact pins for every RC/next package (no `^`), since RC releases break | my call |
| Design system | `tokens.css`, `base.css`, `components.css`, `utilities.css` move over unchanged; the semantic-alias rule and `.dark` theming stay | my call (follows CLAUDE.md) |
| Component styles | each Vue `<style scoped>` becomes a CSS Module next to its `.tsx` (`Foo.module.css`), Vite-native | my call |
| Testing | local only, against the real database, with throwaway records | Christoph |
| Existing sessions | the desk session cookie format changes; Christoph signs in once more after deploy | my call |

Packages already added on the branch: `solid-js@2.0.0-rc.21`, `@solidjs/web@2.0.0-rc.21`,
`@solidjs/router@2.0.0-next.44`, `@solidjs/vite-plugin@3.0.0-next.57`,
`@solidjs/diagnostics@2.0.0-rc.21`, `@tanstack/intent@0.5.6`.

## Mapping from the Nuxt app

| Today (Nuxt) | Afterwards (Solid 2) |
| --- | --- |
| `app/pages/**/*.vue`, file routing | `src/routes/**/*.tsx` with `filesystem-routing` + `@solidjs/router/fs` |
| `app/layouts/default.vue`, `desk.vue` | layout route components wrapping their children |
| `app/app.vue` head/SEO, `useSeoMeta` | `Document.tsx` plus `@solidjs/meta@next` per route |
| `app/error.vue` | `[...404].tsx` and an `<Errored>` boundary with the same look |
| `useFetch` / `$fetch` / `refreshNuxtData(key)` | `query()` reads over `'use server'` functions; desk writes through `action()`/`formAction()` with revalidation of the matching query keys |
| `server/api/**` (h3 handlers) | server functions for what only the app calls; API routes (uppercase `GET` exports) only where a URL is part of the contract, e.g. `/christoph-stach-cv.pdf` and anything Chromium or ISR fetches |
| `server/utils/*`, `server/db/*` | stay plain TypeScript, marked `server-only`; logic is moved, not rewritten |
| `nuxt-auth-utils` GitHub OAuth + sealed session | own GitHub OAuth flow (authorize redirect, callback, token exchange, `/user` lookup, ID check against `DESK_GITHUB_USER_ID`) plus a signed cookie session as in the template (`@remix-run/cookie`) |
| `app/middleware/desk.global.ts` | `start.middleware`: `/desk/**` without session → redirect `/login`, `/login` with session → `/desk`; every desk server function and API route checks the session itself |
| `@nuxtjs/color-mode` | `color-mode` cookie, read by the server on uncached pages and by a blocking inline head script on all pages; `ThemeToggle` keeps light/dark/system |
| `@nuxt/icon` (Tabler) | Tabler icons as inline SVG components, only the ones used |
| `@nuxt/fonts` (Fontsource static weights 400–700, preloaded) | `@fontsource/ibm-plex-sans` and `@fontsource/jetbrains-mono` static weights, self-hosted, preloaded; still static weights (Type3 issue in Chrome's PDF) |
| `routeRules` (ISR, headers, redirect, `maxDuration`, bypass token) | the same rules in the Nitro config |
| `noScripts` on `/` and `/curriculum` | see "Public pages and JavaScript" |

## Public pages and JavaScript

Today `/` and `/curriculum` ship no Vue. Their only JavaScript is hand-written: the
color-mode script in the head and the theme toggle's inline fallback script
(`ThemeToggle.vue`). The scroll reveals are CSS only and stay CSS.

Christoph's rule: **what is raw JavaScript today may become Solid.** So:

- The theme toggle becomes a normal Solid component on every page, public pages included
  (light → dark → system, same icons, labels and `title`). The inline fallback script goes.
- The rest of the page stays server markup and doesn't hydrate: content, header, footer,
  timeline. Preferred: the page is server-rendered and only the toggle hydrates (a server
  component with the toggle in a slot, or the router's equivalent). If the router can't
  hydrate just the toggle, a full-page hydration is acceptable only after Christoph agrees.
- **The choice is remembered in a cookie** (Christoph's choice), not in `localStorage`:
  `color-mode=light|dark|system`, `Path=/`, one year, `SameSite=Lax`, readable by script.
  The toggle writes it.
- **Every page reads the cookie on the server**, the public ones included (Christoph's
  choice: `/` and `/curriculum` are rendered per request, see "Data, caching and
  revalidation"). With `light` or `dark` the server renders `<html class="dark">` (or not)
  and the toggle's state directly, so nothing flashes and no script is needed for it.
- Only `system` (and no cookie, which means `system`) needs the browser: the server can't
  know the device's preference, so a tiny blocking inline head script checks
  `prefers-color-scheme` and sets `.dark` before the first paint, and only in that case.
- Visitors with a choice saved under Nuxt's `localStorage` key `nuxt-color-mode` get it
  moved into the cookie once by that head script, then the key is removed (my call).
- Their images stay in `public/`.

## Data, caching and revalidation

- **Change from today (Christoph's choice):** `/` and `/curriculum` are no longer ISR-cached
  as HTML. They are server-rendered on every request, so they can honour the `color-mode`
  cookie. Only their **data** is cached.
- The data stays behind the endpoints that are ISR-cached today, `/api/cv-home` and
  `/api/cv-website`: the page render fetches them, Vercel's edge answers from the cache, and
  Neon is only asked after a deploy or a revalidation. This cache is shared across all
  function instances, which an in-memory cache would not be (my call).
- `/christoph-stach-cv.pdf` stays ISR-cached as today; it has no color mode.
- `revalidatePaths` and `server/utils/cv-public-paths.ts` keep working with
  `ISR_BYPASS_TOKEN`, now renewing `/api/cv-home`, `/api/cv-website` and the PDF;
  `/` and `/curriculum` drop out of the list.
- Cost of the change: each public page view is one function invocation (render plus a
  cached fetch) instead of a pure CDN hit. Accepted.
- `/cv-print` stays server-rendered, `noindex`, unlinked; Chromium prints it.
- The PDF route keeps `puppeteer-core` + `@sparticuz/chromium` (or `CV_PDF_CHROME_PATH`), one
  Chrome per instance, `maxDuration: 60`.
- The desk's page checks (`page_fills`, the background re-check after a deploy) need a build
  identifier; the builder supplies one in place of Nuxt's.

## Environment variables

Renamed to describe what they are rather than which framework reads them (Christoph's
choice; names are my call). All are declared and validated in `env.ts`, server-only.

| Today | Afterwards | Note |
| --- | --- | --- |
| `NUXT_APP_SECRET` | `SESSION_SECRET` | signs the session cookie; comma-separated for rotation, newest first |
| `NUXT_OAUTH_GITHUB_CLIENT_ID` | `GITHUB_CLIENT_ID` | |
| `NUXT_OAUTH_GITHUB_CLIENT_SECRET` | `GITHUB_CLIENT_SECRET` | |
| `NUXT_DESK_GITHUB_ID` | `DESK_GITHUB_USER_ID` | numeric GitHub user ID |
| `NUXT_CV_PDF_CHROME` | `CV_PDF_CHROME_PATH` | optional, local Chrome binary |
| `NUXT_ISR_BYPASS_TOKEN` | `ISR_BYPASS_TOKEN` | build time and runtime |
| `NUXT_DATABASE_URL` | dropped | the override is unused; `DATABASE_URL` is read directly |
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED` | unchanged | set by Vercel's Neon integration |

`.env.example` is rewritten with the new names, and Christoph updates his local `.env` to
match, since testing is local. Vercel is **not** touched during the rewrite (Christoph's
choice): the new variables are added there only after the rewrite is finished and Christoph
has tested everything locally, as a separate step before the merge; the old `NUXT_*` ones are
removed after the new deployment works.

## Agent skills (done)

Solid 2 ships its agent skills inside the npm packages (`node_modules/solid-js/skills/…`)
and tags them for TanStack Intent. Enabled: `solid-js#solid-2.0`, `#solid-2.0-cheatsheet`,
`#reactivity-diagnostics`, `@solidjs/web#server-components`,
`@solidjs/diagnostics#agent-loops`. Skills from transitive Nuxt dependencies stay disabled.
The optional Intent hooks (`intent hooks install`), which block edits until a skill is
loaded, are not installed.

## Tooling

pnpm, Node from `.nvmrc`, oxlint + oxfmt stay. `eslint-plugin-solid` (config `v2`) is
recommended by Solid; whether oxlint can run it via its JS plugins or it is left out is the
builder's call. `typecheck` becomes `tsc -b` with `jsxImportSource: "@solidjs/web"`. Nuxt,
Vue and their modules leave `package.json` at the end.

## Verification

No test suite. Before merging:

1. `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm build` pass.
2. Dev runs show no Solid diagnostic codes (`agent-loops` skill, `/__solid/diagnostics`).
3. Side by side with production: every public route's HTML (head and body) matches in
   content and metadata; screenshots of `/` and `/curriculum` in light and dark at phone and
   desktop width match; on `/` and `/curriculum` the only JS is the head theme script and
   the Solid theme toggle; the toggle works, its choice survives a reload and a visit to the
   desk (cookie), and a choice saved under `nuxt-color-mode` is carried over.
4. The CV PDF from the branch matches today's: page count, page breaks, fonts embedded (no
   Type3), links.
5. Walk through the desk **locally** (Christoph's choice: local testing is enough; the GitHub
   OAuth app's callback only fits production). Local `.env` points at the **real
   production database**, so the walkthrough only creates throwaway records (a test entry,
   variant, project, cover letter) and deletes them afterwards; existing records are only
   opened, or saved without changes. Primary/website roles are switched only to a throwaway
   variant and straight back. Covered: log in, the wrong account is refused, edit and save
   every content type, reorder, create/delete a variant, check pages, a cover letter in `en`
   and `de`, sign out. An unauthenticated call to every desk endpoint is refused.
   `pnpm db:migrate` is never run as part of the rewrite.
6. ISR can't be exercised locally: the build output's Vercel config is checked for ISR on
   `/api/cv-home`, `/api/cv-website` and the PDF (not on `/` and `/curriculum`), the bypass
   token and `maxDuration`; renewal after a desk save is checked once in production after
   the merge. Locally: with the cookie set to `dark`, `curl` of `/` and `/curriculum`
   returns `<html class="dark">`.

## Left to the builder

File layout under `src/`, how layouts nest, query keys, the exact OAuth/state handling (with
CSRF `state`), how components are split, how only the toggle hydrates on the public pages,
and the build ID. `CLAUDE.md`, `README.md` and `DESIGN.md` are updated to describe the new
stack at the end; `DESIGN.md`'s design direction itself doesn't change.
