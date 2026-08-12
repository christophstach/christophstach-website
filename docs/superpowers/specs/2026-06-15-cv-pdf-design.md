# Downloadable CV PDF — Design

Date: 2026-06-15
Status: Approved (pending spec review)

## Goal

Let visitors download a professional, clean PDF CV that Christoph can send directly to
recruiters and companies. The PDF is generated from the website's own data so it never drifts
from the site content.

## Decisions (locked)

- **Look:** Clean & classic — black text on white, sans-serif (Inter), traditional CV layout.
  Optimised for human recruiters and ATS (resume-scanning) systems. No dark/terminal styling.
  **Refined 2026-08-12:** the canonical design is the CV in the `cv-english-nextjs` repo
  (`components/curriculum-vitea/*`, rendered A4 with a 48px margin). `cv-print.vue` ports its
  Tailwind values as computed px. Sections: Summary, Technical Skills, Experience, Education —
  no Projects section.
- **Contact info:** ~~Minimal / anti-scraping — LinkedIn, GitHub, and website URL only. **No email
  or phone number** in the public PDF.~~ **Superseded 2026-08-12:** the PDF mirrors the reference
  CV in `cv-english-nextjs`, which carries email and phone. Both are now in `profile` and printed.
- **Delivery:** A prebuilt `christoph-stach-cv.pdf` committed as a static asset, plus a
  "Download CV (PDF)" button on the site. Regenerated via a dedicated script (Approach A).

## Approach A — committed asset, regenerated via script

Mirrors the existing repo convention for generated-but-committed assets (`public/images/og.png`,
hand-maintained `public/sitemap.xml`). The production deploy command (`pnpm generate`) stays
unchanged and does **not** require Chrome. The PDF is regenerated on demand with `pnpm generate:cv`.

Trade-off: the committed PDF must be regenerated after editing `app/data/cv.ts`, the same
staleness coupling already documented for the OG card and sitemap. Accepted and documented.

## Architecture

### 1. Centralise data — `app/data/cv.ts`

Single source of truth for both the website and the PDF.

- Move `skillGroups` out of `app/pages/index.vue` into `cv.ts` as `export const skills`.
  `index.vue` imports it instead of defining it inline. (The derived values
  `totalSkills` / `maxGroup` stay computed in `index.vue`.)
- Add `export const profile` holding contact/identity data, no email/phone:
  ```ts
  export const profile = {
    name: "Christoph Stach",
    role: "Senior Full-Stack Engineer",
    location: "Berlin, Germany",
    // Reuse the existing professional summary (the `description` string in app.vue /
    // the hero "about" paragraph), kept here as the single source.
    summary: "Christoph Stach is a full-stack engineer based in Berlin ...",
    links: [
      { label: "Website", href: "https://christophstach.de" },
      { label: "LinkedIn", href: "https://www.linkedin.com/in/christoph-stach-7586b958" },
      { label: "GitHub", href: "https://github.com/christophstach" },
    ],
  };
  ```

### 2. Print page — `app/pages/cv-print.vue`

- Renders, from `cv.ts`: header (name, role, location, links) + summary → Experience → Education
  → Projects → Skills. Uses the existing `experience`, `education`, `projects`, new `skills`,
  and `profile` exports. Dates via `formatMonth` from `app/utils/format.ts`.
- Clean A4 print styling in a scoped `<style>`:
  - `@page { size: A4; margin: 16mm; }`
  - Black-on-white, Inter sans-serif, restrained type scale, tuned to fit ~1–2 pages.
  - `break-inside: avoid` on entries so jobs/sections don't split awkwardly across pages.
- `useSeoMeta({ robots: "noindex, nofollow" })` — the route is an internal build input, not a
  page to be indexed. It is unlinked from the site nav.

### 3. Hide site chrome when printing — global print CSS

Add a `@media print` block (in `app/assets/css/base.css`) that hides `.header`, `.footer`, and
`.skip-link`, and removes `.layout__main` padding. This keeps the printed `/cv-print` output
clean without a layout refactor, and also improves printing of any other page. No `<NuxtLayout>`
refactor is required.

### 4. Generation script — `scripts/generate-cv-pdf.mjs`

1. Assumes `.output/public` exists (built by `nuxt generate`).
2. Starts a zero-dependency Node `http` static file server over `.output/public` on an
   ephemeral port (so absolute `/_nuxt/...`, font, and CSS URLs resolve — `file://` would not).
3. Locates Chrome (`CHROME_BIN` env var, else common paths incl. `google-chrome`).
4. Runs headless Chrome:
   `--headless --no-sandbox --no-pdf-header-footer --print-to-pdf=<out> http://localhost:<port>/cv-print`
   writing to `public/christoph-stach-cv.pdf`.
5. Shuts the server down; exits non-zero with a clear message if Chrome is missing or the PDF
   wasn't produced.

The `/cv-print` route must be prerendered so the script can load it. Add it to
`nuxt.config.ts` `routeRules` (`"/cv-print": { prerender: true }`). It ships as a bare,
noindexed HTML page (harmless, unlinked); the user-facing artifact is the PDF.

`package.json`: add `"generate:cv": "nuxt generate && node scripts/generate-cv-pdf.mjs"`.

### 5. Download button

- Primary: on `app/pages/curriculum.vue`, near the page title — a `.button` linking to
  `/christoph-stach-cv.pdf` with the `download` attribute and a `tabler:download` icon.
- Secondary: add the same link to the hero actions in `index.vue` (next to `./curriculum`),
  since the landing hero is the main CTA for recruiters.
- `tabler:download` is used statically, so `@nuxt/icon`'s `clientBundle.scan` picks it up — no
  `nuxt.config.ts` icon change needed.

### 6. Documentation — `CLAUDE.md`

Add a gotcha next to the OG-card/sitemap notes: the committed `public/christoph-stach-cv.pdf` is
generated from `/cv-print` via `pnpm generate:cv` and must be regenerated after editing
`app/data/cv.ts`.

## Data flow

```
app/data/cv.ts ──┬─► index.vue / curriculum.vue / CvTimeline (website)
                 └─► cv-print.vue ─► nuxt generate ─► .output/public/cv-print/
                                          │
                          scripts/generate-cv-pdf.mjs (static server + headless Chrome)
                                          │
                                          ▼
                          public/christoph-stach-cv.pdf  ─►  Download button (/christoph-stach-cv.pdf)
```

## Error handling

- Script exits non-zero with an actionable message if: `.output/public` is missing, Chrome is
  not found, or the output PDF is 0 bytes / not created.
- Page rendering is pure data → markup; no runtime fetching, no failure modes at request time.

## Testing / verification

No unit-test suite exists in this repo. Verification is manual and build-based:

- `pnpm lint`, `pnpm format:check`, `pnpm typecheck` pass.
- `pnpm generate:cv` produces `public/christoph-stach-cv.pdf`; open it and confirm: clean A4,
  correct sections from `cv.ts`, no email/phone, working links, ~1–2 pages.
- `pnpm generate` then confirm the PDF is served at `/christoph-stach-cv.pdf` and the download
  button works.
- Re-render is deterministic from `cv.ts` (edit data → rerun `generate:cv` → PDF reflects it).

## Out of scope (YAGNI)

- No client-side/on-the-fly PDF generation, no JS PDF library.
- No email/phone, no QR codes, no multi-language variants.
- No `<NuxtLayout>` refactor (global print CSS suffices).
- No automated regeneration inside `pnpm generate` (kept decoupled like the OG card).
