# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Personal CV website for Christoph Stach (christophstach.de), built with **Nuxt** on the
nightly channel (`nuxt-nightly@latest`, `compatibilityVersion: 5`) and prerendered to a
static site. No backend, no database — content is hardcoded TypeScript, styling is a
hand-rolled pure-CSS design system.

## Commands

Package manager is **pnpm**. Node version is pinned in `.nvmrc` (24.12.0).

```bash
pnpm install        # also runs `nuxt prepare` via postinstall
pnpm dev            # dev server
pnpm generate       # prerender static site to .output/public (production output)
pnpm preview        # preview the production build
pnpm lint           # oxlint
pnpm lint:fix       # oxlint --fix
pnpm format         # oxfmt (formatter)
pnpm format:check   # oxfmt --check
pnpm typecheck      # vue-tsc via nuxt
```

There is no test suite. `pnpm build` exists but `pnpm generate` is the relevant command —
the site ships as static files (`dist` symlinks to `.output/public`).

Tooling is **oxlint + oxfmt** (the Oxc toolchain), not ESLint/Prettier. Lint runs with all
strictness categories (`correctness`, `suspicious`, `pedantic`, `perf`, `style`) as errors;
`no-console` is an error. Component/file names must be kebab-case or PascalCase.

## Architecture

**Content is data, not markup.** All CV content lives in `app/data/cv.ts` as typed arrays
(`experience`, `education`, `projects`, etc.) keyed by interfaces like `TimelineEntry`. Pages
(`app/pages/index.vue`, `curriculum.vue`) and `CvTimeline.vue` render from this data. To
change CV content, edit `cv.ts` — do not hardcode entries into templates. Dates are ISO
month strings (`"2023-10"`) formatted for display via `app/utils/format.ts` (`formatMonth`).

**CSS design system is layered, imported once via `app/assets/css/main.css`:**

1. `tokens.css` — two tiers: *primitives* (raw scales: color palettes, type, spacing) and
   *semantic aliases* (`--color-text`, `--color-accent`, …). **Components must consume only
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
stale.

**SEO/meta** (per-route canonical, OG/Twitter tags, `og:locale`, and the JSON-LD `Person`
block) all live in `app.vue`; per-page `title`/`ogTitle` are set in the page via `useSeoMeta`.

## Gotchas

- This tracks Nuxt **nightly**, so APIs can drift from stable docs. Two workarounds already
  live in `nuxt.config.ts` with explanatory comments (Nitro auto-imports re-enabled for
  `@nuxt/icon`; `compatibilityVersion: 5`). Preserve those comments if you touch that file.
- Icons use `@nuxt/icon` with the Tabler set (`@iconify-json/tabler`). New icons used by the
  theme toggle must be added to `icon.clientBundle.icons`.
- The Open Graph social card (`public/images/og.png`, 1200×630) is generated from the
  `tools/og-card.html` template, not hand-painted. Regenerate after editing the template with:
  `google-chrome --headless=new --hide-scrollbars --window-size=1200,630 --screenshot=public/images/og.png tools/og-card.html`
