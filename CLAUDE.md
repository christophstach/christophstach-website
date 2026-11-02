# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Personal CV website for Christoph Stach (christophstach.de), built with **Nuxt** on the
nightly channel (`nuxt-nightly@latest`, `compatibilityVersion: 5`), deployed on Vercel. The
public pages are server-rendered and cached with ISR, the private `/desk` area is
server-rendered behind GitHub auth. CV content (entries, bullets, skills, projects) and the CV
variants, which pick from it for `/curriculum` and the printed CV, live in Postgres (Neon),
accessed with Drizzle ORM and edited in the desk. Styling is a hand-rolled pure-CSS design
system.

## Commands

Package manager is **pnpm**; the Node version is pinned in `.nvmrc`. See `package.json`
for the script list.

There is no test suite. `pnpm build` is the deploy build (Vercel): it prerenders the public
routes and bundles the Nitro server for `/desk`, `/auth/github` and the CV PDF. `pnpm generate`
still works for a static-only build, but it can't serve the desk or the PDF. On Vercel the
`vercel-build` script runs instead: `drizzle-kit migrate`, then `nuxt build`.

Database: the schema is `server/db/schema.ts`; after changing it run `pnpm db:generate` and
commit the SQL migration in `server/db/migrations`. `pnpm db:migrate` applies migrations to
`DATABASE_URL_UNPOOLED` (or `DATABASE_URL`). Data changes that must ship with the code, like
the initial variants, are custom migrations (`drizzle-kit generate --custom`).

Tooling is **oxlint + oxfmt** (the Oxc toolchain), not ESLint/Prettier — see `.oxlintrc.json`
for the enabled rule categories.

## Architecture

**Content is data, not markup.** CV content lives in the database, typed by the interfaces in
`app/data/cv.ts` (`TimelineEntry`, `EntryRecord`, `SkillGroup`, `Profile`, `CvContent`). The
profile (the PDF header, one row of `cv_profile`, at `/desk/cv/profile`), timeline entries (`cv_entries`, bullets as an ordered jsonb list),
skill groups (`skill_groups`) and projects (`projects`) are edited in the desk under
`/desk/cv/experience`, `education`, `skills` and `projects` (so those and `profile` can't be
variant ids);
`server/utils/cv-content.ts` loads them (`loadCvContent`) and writes them, and
`projects.ts` does the projects. Entries, bullets and skill groups carry stable ids that
can't change once created, and **variants** pick them by id, in order. Variants are rows in
the database (`cv_variants`, `cv_variant_entries`), typed by `CvVariant` in
`app/data/cv-variants.ts` and edited at `/desk/cv/<id>` (`server/api/desk/cv-variants/`);
`server/utils/cv-variants.ts` holds their database access. Saving a variant checks every id
against the content (`printVariant` in `app/utils/cv-variant.ts`); deleting an entry, bullet,
skill group or project takes it out of every variant. A variant's projects print after its experience,
and `/curriculum` shows the website variant's. Pages and `CvTimeline.vue` render from fetched data; do not hardcode entries
into templates. Two
variants hold a public role and can't be deleted: the one marked primary is the printed CV
(`/cv-print`, `/christoph-stach-cv.pdf`), the one marked website is the experience and
education and the projects on `/curriculum` (`/api/cv-website`). The others are private, at `/desk/cv-print/<id>` and `/api/desk/cv/<id>`. All variants render
through the one `CvDocument.vue`, so a variant changes content, never layout. Dates are ISO
month strings (`"2023-10"`) formatted for display via `app/utils/format.ts` (`formatMonth`).

**CSS design system is layered, imported once via `app/assets/css/main.css`:**

1. `tokens.css` — two tiers: _primitives_ (raw scales: color palettes, type, spacing) and
   _semantic aliases_ (`--color-text`, `--color-accent`, …). **Components must consume only
   semantic aliases, never primitives.** Dark mode works by overriding semantic aliases under
   the `.dark` class — so a correctly-built component themes automatically.
2. `base.css` — reset / element defaults.
3. `components.css` — shared global classes (`.button`, `.chip`, `.icon-button`,
   `.section-label`, `.text-link`). Reuse these before inventing new styles.
4. `utilities.css` — layout helpers (`.container`).

Per-component visual styling goes in scoped `<style>` blocks; cross-component patterns belong
in `components.css`.

**Dark mode** uses `@nuxtjs/color-mode` with `classSuffix: ""` (so the class is literally
`.dark`). `ThemeToggle.vue` cycles light/dark/system. Because the site is statically hosted,
theme icons (`tabler:sun/moon/device-desktop`) are bundled client-side via the `icon.clientBundle`
config in `nuxt.config.ts` rather than fetched. `app.vue` emits per-scheme `theme-color` meta
tags so browser chrome is correct before hydration.

**Routing/prerender** is declared in `nuxt.config.ts` `routeRules`: `/` is server-rendered
(it counts jobs and shows skills via `/api/cv-home`) and cached with ISR, renewed whenever the
desk changes CV content (`allPublicPaths`);
`/curriculum` is server-rendered from the database and cached with ISR, renewed on demand when
the desk changes the website variant (`revalidatePaths`, `server/utils/cv-public-paths.ts`); `/about-me` 301-redirects to `/`. Add new prerendered routes there — and also add
the URL to `public/sitemap.xml`, a hand-maintained static file (no sitemap module), or it goes
stale. `/cv-print` is a server-rendered (it reads the primary variant from the database),
`noindex`, unlinked print-only page used solely as the source for the CV PDF.

**Layouts.** `app/layouts/default.vue` holds the public chrome (skip link, `AppHeader`,
`AppFooter`); `app/layouts/desk.vue` is the desk shell with the left sidebar. Pages opt into
the desk with `definePageMeta({ layout: "desk" })`.

**Desk and auth** use `nuxt-auth-utils` (sealed-cookie sessions, GitHub OAuth). The
OAuth handler (`server/routes/auth/github.get.ts`) only creates a session for the GitHub
user ID in `runtimeConfig.deskGithubId` (`NUXT_DESK_GITHUB_ID`). `app/middleware/desk.global.ts`
redirects anonymous `/desk/**` requests to `/login`, including during SSR. Sidebar sections
are data in `app/data/desk.ts`: a new section is one entry there plus a page under
`app/pages/desk/`. The layout lists the CV variants under the cv section, then a projects link, from
the same `useFetch` key the pages use (`desk-cv-variants`; projects use `desk-projects`); after a write,
`refreshNuxtData` with that key updates page and sidebar. Desk editors share `DeskPickList`
(pick and drag-reorder ids), `DeskFormSection` (titled form sections), `DeskSaveBar` and `DeskMenu`.
The variant editor lists every section as plain checkbox lists (`DeskVariantPicks.vue`): checked
rows print in the order shown, picked entries list their bullets underneath. Any server API for the desk goes under `server/api/desk/` and must call
`requireUserSession(event)`; the page middleware does not protect API routes. Required env
vars are listed in `.env.example`.

**SEO/meta** (per-route canonical, OG/Twitter tags, `og:locale`, and the JSON-LD `Person`
block) all live in `app.vue`; per-page `title`/`ogTitle` are set in the page via `useSeoMeta`.

## Gotchas

- This tracks Nuxt **nightly**, so APIs can drift from stable docs. Two workarounds already
  live in `nuxt.config.ts` with explanatory comments (Nitro auto-imports re-enabled for
  `nuxt-auth-utils`; `compatibilityVersion: 5`). Preserve those comments if you touch that file.
- Imports are explicit from public package paths (`vue`, `nuxt/app`, `h3`, …). The exception
  is nuxt-auth-utils, which exposes no import paths: `useUserSession` comes from `#imports` in
  app code, and its server utils stay Nitro auto-imports. Don't import them from `#imports` in
  `server/`, because typed `$fetch` also checks server routes in the app program.
- `tsconfig.json` uses Nuxt's project references but leaves out `tsconfig.node.json`
  (`nuxt.config.ts`); see the comment there.
- Icons use `@nuxt/icon` with the Tabler set (`@iconify-json/tabler`). New icons used by the
  theme toggle must be added to `icon.clientBundle.icons`.
- The Open Graph social card (`public/images/og.png`, 1200×630) is generated from the
  `tools/og-card.html` template, not hand-painted. Regenerate after editing the template with:
  `google-chrome --headless=new --hide-scrollbars --window-size=1200,630 --screenshot=public/images/og.png tools/og-card.html`
- The downloadable CV (`/christoph-stach-cv.pdf`) is not a file in the repo. The server route
  `server/routes/christoph-stach-cv.pdf.get.ts` prints the `/cv-print` page through
  `server/utils/cv-pdf.ts` (one Chrome at a time per instance) with `puppeteer-core` (`@sparticuz/chromium`, or the Chrome in `NUXT_CV_PDF_CHROME` off Linux), and
  `routeRules` caches it with ISR until the next deployment. When the desk saves the primary
  variant or makes another one primary, `revalidatePaths` renews that cache on demand with
  `NUXT_ISR_BYPASS_TOKEN` (also needed at build time, for the Vercel ISR config). Page breaks are CSS rules in `CvDocument.vue`; don't tune
  spacing to move a break; the desk variant editor shows how
  full each page is (`server/api/desk/cv-pdf.get.ts`, `DeskCvPdf.vue`, rules in
  `app/utils/cv-layout.ts`; the result is stored as `page_fills` with the build that made it; after a deploy the desk
  layout re-checks every variant in the background, `app/utils/desk-page-checks.ts`), flagging more than two
  pages, a gap before the last page and a nearly empty last page. The serverless Chromium has no system fonts, so the PDF
  must only use the site's own web fonts (IBM Plex Sans, JetBrains Mono via `@nuxt/fonts`).
- `public/images/hero.png` is a crawler-facing copy of `app/assets/images/hero.webp` for the
  JSON-LD `Person.image` (the bundled asset gets a hashed URL). Keep the two in sync.
