# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Personal CV website for Christoph Stach (christophstach.de), built with **Nuxt** on the
nightly channel (`nuxt-nightly@latest`, `compatibilityVersion: 5`). Hybrid rendering: the
public pages are prerendered, while the private `/desk` area is server-rendered behind GitHub
auth (deployed on Vercel). No database — content is hardcoded TypeScript, styling is a
hand-rolled pure-CSS design system.

## Commands

Package manager is **pnpm**; the Node version is pinned in `.nvmrc`. See `package.json`
for the script list.

There is no test suite. `pnpm build` is the deploy build (Vercel): it prerenders the public
routes and bundles the Nitro server for `/desk` and `/auth/github`. `pnpm generate` still
works for a static-only build and for `generate:cv`, but it can't serve the desk.

Tooling is **oxlint + oxfmt** (the Oxc toolchain), not ESLint/Prettier — see `.oxlintrc.json`
for the enabled rule categories.

## Architecture

**Content is data, not markup.** All CV content lives in `app/data/cv.ts` as typed arrays
(`experience`, `education`, `projects`, etc.) keyed by interfaces like `TimelineEntry`. Pages
(`app/pages/index.vue`, `curriculum.vue`) and `CvTimeline.vue` render from this data. To
change CV content, edit `cv.ts` — do not hardcode entries into templates. Dates are ISO
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

**Routing/prerender** is declared in `nuxt.config.ts` `routeRules`: `/` and `/curriculum` are
prerendered; `/about-me` 301-redirects to `/`. Add new prerendered routes there — and also add
the URL to `public/sitemap.xml`, a hand-maintained static file (no sitemap module), or it goes
stale. `/cv-print` is a prerendered, `noindex`, unlinked print-only page used solely as the
source for the CV PDF.

**Layouts.** `app/layouts/default.vue` holds the public chrome (skip link, `AppHeader`,
`AppFooter`); `app/layouts/desk.vue` is the desk shell with the left sidebar. Pages opt into
the desk with `definePageMeta({ layout: "desk" })`.

**Desk and auth** use `nuxt-auth-utils` (sealed-cookie sessions, GitHub OAuth). The
OAuth handler (`server/routes/auth/github.get.ts`) only creates a session for the GitHub
user ID in `runtimeConfig.deskGithubId` (`NUXT_DESK_GITHUB_ID`). `app/middleware/desk.global.ts`
redirects anonymous `/desk/**` requests to `/login`, including during SSR. Sidebar sections
are data in `app/data/desk.ts`: a new section is one entry there plus a page under
`app/pages/desk/`. Any server API for the desk goes under `server/api/desk/` and must call
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
- The downloadable CV (`public/christoph-stach-cv.pdf`) is generated from the hidden `/cv-print`
  route via `pnpm generate:cv` (headless Chrome → `--print-to-pdf`) and committed. Regenerate it
  after editing `app/data/cv.ts`, the same as the OG card and sitemap.
- `public/images/hero.png` is a crawler-facing copy of `app/assets/images/hero.webp` for the
  JSON-LD `Person.image` (the bundled asset gets a hashed URL). Keep the two in sync.
