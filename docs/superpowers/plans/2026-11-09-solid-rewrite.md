# Solid 2 Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Nuxt/Vue implementation of christophstach.de with Solid 2 in the SSR start mode of `@solidjs/vite-plugin`, with identical URLs, look, data and behaviour.

**Architecture:** One Vite app: `@solidjs/vite-plugin` (start mode, `ssr: true`) renders pages and serves `'use server'` functions; `filesystem-routing` turns `src/routes/` into page and API routes; `nitro/vite` wraps the handler for Vercel and carries ISR, headers, redirects and function limits. Server logic from `server/utils` moves to `src/server/` almost unchanged (h3 helpers replaced by web `Request`/`Response`); the Drizzle schema and migrations stay in `server/db/`.

**Tech Stack:** solid-js 2.0.0-rc.21, @solidjs/web 2.0.0-rc.21, @solidjs/router 2.0.0-next.44, @solidjs/meta 1.0.0-next.2, @solidjs/vite-plugin 3.0.0-next.57, filesystem-routing 0.5.0, vite 8, nitro 3 (rc), drizzle-orm + postgres, @remix-run/cookie, valibot, puppeteer-core + @sparticuz/chromium, unpdf, Fontsource, Tabler icons.

**Spec:** `docs/superpowers/specs/2026-11-09-solid-rewrite-design.md`

## Global Constraints

- Before writing Solid code, load the skills: `pnpm exec intent load solid-js#solid-2.0` (always), `solid-js#solid-2.0-cheatsheet` for exact signatures, `@solidjs/web#server-components` for server components, `@solidjs/diagnostics#agent-loops` for checking. No Solid 1.x or React patterns (destructured props, one-argument `createEffect`, `createResource`, `onMount`, `<Suspense>`, `solid-js/web`, `classList`).
- Every RC/next package is pinned to an exact version (no `^`/`~`).
- Same URLs, same HTML semantics and SEO metadata, same look in light and dark, same PDF output as production today. The Vue files are the reference: port, don't redesign.
- `server/db/schema.ts` and `server/db/migrations/` are not changed. `pnpm db:migrate` is never run. Local `.env` points at the **real production database**: manual checks create throwaway records and delete them; existing records are only opened or saved unchanged.
- Env vars (validated in `env.ts`, server-only): `SESSION_SECRET` (≥32 chars, comma-separated, newest first), `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `DESK_GITHUB_USER_ID` (numeric), `CV_PDF_CHROME_PATH` (optional), `ISR_BYPASS_TOKEN` (optional locally), `DATABASE_URL`, `DATABASE_URL_UNPOOLED` (optional). No `NUXT_*` names anywhere. Vercel is not touched.
- Color mode: cookie `color-mode` = `light|dark|system`, `Path=/`, `Max-Age=31536000`, `SameSite=Lax`, not HttpOnly. Missing or unknown value means `system`. One-time migration from `localStorage["nuxt-color-mode"]`, then that key is removed.
- `/` and `/curriculum` are rendered per request (no ISR); `/api/cv-home`, `/api/cv-website` and `/christoph-stach-cv.pdf` are ISR-cached. On `/` and `/curriculum` only the theme toggle may hydrate; full-page hydration needs Christoph's OK first.
- CSS: `tokens.css`, `base.css`, `components.css`, `utilities.css` copied unchanged; components consume semantic aliases only; each Vue `<style scoped>` becomes `<Name>.module.css` beside `<Name>.tsx`.
- Desk data goes through `'use server'` functions (`query()` for reads, `action()` for writes). URL endpoints exist only for: `/api/cv-home`, `/api/cv-website`, `/christoph-stach-cv.pdf`, `/api/desk/cv/[variant]`, `/api/desk/cover-letters/[id]/pdf`, `/auth/github`. Every desk server function and desk endpoint calls `requireUser()` first.
- No test suite (spec non-goal). Each task ends with the listed commands; `pnpm typecheck`, `pnpm lint` and `pnpm format:check` pass at the end of every task from Task 1 on.
- Commit after each task on `solid-rewrite`, message style as in `git log` (plain sentence, imperative).

## Review Focus

1. **A desk server function called directly without a session** (POST to `/_server/...` with no cookie) must be refused, not just hidden by the page middleware → check added to Task 8.
2. **A visitor with no cookie on a dark-preference device, and a garbage cookie value** (`color-mode=foo`) must get the right theme without a flash; garbage counts as `system` → check added to Task 2.
3. **OAuth callback with a missing or wrong `state`, an error from GitHub, or another GitHub account** must end at `/login?error=oauth` or `/login?error=forbidden` without a session → check added to Task 8.
4. **The CV PDF on a cold start with several simultaneous requests** (the desk asks for several at once) must share one Chrome; fonts must be embedded, not Type3 → check added to Task 7.
5. **Leaving a desk editor with unsaved changes** (link click, same page with another id, closing the tab) must ask first, and not ask after a save or delete → check added to Task 10.

---

### Task 1: Scaffold the Solid app beside the Nuxt sources

**Files:**
- Create: `vite.config.ts`, `env.ts`, `src/Document.tsx`, `src/App.tsx`, `src/router.ts`, `src/middleware.ts`, `src/server-config.ts`, `src/routes/index.tsx` (placeholder), `src/assets/css/{main,tokens,base,components,utilities}.css` (copied from `app/assets/css/`), `src/build-id.ts`
- Modify: `package.json`, `tsconfig.json`, `.oxlintrc.json`, `.gitignore`, `pnpm-workspace.yaml` (build-script allow-list if pnpm asks)

**Interfaces:**
- Produces: `Router`, `paths` (from `src/router.ts`); `env` from `virtual:solid-env/server`; `BUILD_ID: string` (from `src/build-id.ts`); global CSS imported once in `src/App.tsx`.

- [ ] **Step 1:** Add dependencies (exact pins): `@solidjs/meta@1.0.0-next.2`, `filesystem-routing@0.5.0`, `vite@<latest 8.x>`, `nitro@3.0.261103-rc`, `@remix-run/cookie@<latest>`, `valibot@<latest>`. Scripts: `dev: vite`, `build: vite build`, `vercel-build: drizzle-kit migrate && vite build`, `preview: vite preview`, `typecheck: tsc --noEmit`, keep `db:*`, `lint`, `format*`; drop `generate`, `postinstall`. Leave Nuxt/Vue deps installed until Task 13 (the Vue files stay as reference). Add `"engines": { "node": "24.x" }`.
- [ ] **Step 2:** `vite.config.ts`: `solid({ start: { middleware: "./src/middleware.ts" }, ssr: true, diagnostics: true, serverFunctions: { serverSetup: "./src/server-config.ts", components: true }, extensions: [".jsx", ".tsx"] })`, `fileRoutes({ httpMethods: true, types: true })`, `nitro({ preset: "vercel", serverDir: <a directory that doesn't exist, so Nitro doesn't scan the Nuxt `server/`> })`. `server.port: 3000`, `build.target: "esnext"`. Define `__BUILD_ID__` from `VERCEL_DEPLOYMENT_ID ?? VERCEL_GIT_COMMIT_SHA ?? Date.now().toString(36)`; `src/build-id.ts` exports it as `BUILD_ID`.
- [ ] **Step 3:** `env.ts` with the env vars from Global Constraints (valibot; optional ones `v.optional`). No client vars.
- [ ] **Step 4:** `tsconfig.json`: `jsx: "preserve"`, `jsxImportSource: "@solidjs/web"`, `moduleResolution: "bundler"`, `strict`, `types: ["vite/client"]`, include `src`, `server/db`, `env.ts`, `vite.config.ts`, the generated `solid-env.d.ts`/route types; exclude `app`, `server/api`, `server/routes`, `server/utils`, `nuxt.config.ts`. `.oxlintrc.json`: drop the `vue` plugin, ignore `app/`, `server/api`, `server/routes`, `server/utils`, `.output`, `.vercel`; set `env.browser` plus a `src/server/**` override with `env.node`.
- [ ] **Step 5:** `src/Document.tsx` (`<html lang="en">`, charset, viewport, `<HydrationScript />`), `src/App.tsx` (Router + `MetaProvider` + `<Loading>`, imports `main.css`), `src/router.ts`, `src/server-config.ts` (flight collector), `src/middleware.ts` (`[createAPIHandler(routes)]`), placeholder `src/routes/index.tsx` rendering `<main class="container">solid</main>`.
- [ ] **Step 6: Verify dev**

Run: `pnpm dev` then `curl -s localhost:3000/ | grep -c 'solid'`
Expected: `1` or more; the page uses the copied tokens (check `curl -s localhost:3000/ | grep -o 'tokens\|--color-text' | head -1` finds the CSS link or inline style).

- [ ] **Step 7: Verify build**

Run: `pnpm build && ls .vercel/output/functions && cat .vercel/output/config.json | head -40`
Expected: a function directory exists, no route from `server/api` appears, exit code 0. If `nitro/vite` doesn't pick up the Solid handler, stop and report: the plugin's "Deployment contract" (README) and Nitro's `vite-ssr-solid` example are the references.

- [ ] **Step 8:** `pnpm typecheck && pnpm lint && pnpm format:check`, then commit "Scaffold the Solid app beside the Nuxt sources".

### Task 2: Color mode and theme toggle

**Files:**
- Create: `src/lib/color-mode.ts`, `src/components/ThemeToggle.tsx`, `src/components/ThemeToggle.module.css`, `src/components/icons.tsx`, `src/color-mode-script.ts`
- Modify: `src/Document.tsx`, `src/middleware.ts`

**Interfaces:**
- Produces: `type ColorMode = "light" | "dark" | "system"`; `parseColorMode(value: string | null | undefined): ColorMode`; `COLOR_MODE_COOKIE = "color-mode"`; `colorModeCookie(mode: ColorMode): string` (the `document.cookie` string); `getColorMode(): ColorMode` (server: reads the request cookie via `getRequestEvent()`); `<ThemeToggle initial={ColorMode} />`; `Icon` components `IconSun`, `IconMoon`, `IconDeviceDesktop` plus whatever icons later tasks need, each `(props: { size?: number; class?: string }) => JSX.Element` with the Tabler SVG paths inlined; `COLOR_MODE_SCRIPT: string`.

- [ ] **Step 1:** `src/lib/color-mode.ts` with the functions above; unknown values → `"system"`.
- [ ] **Step 2:** `Document.tsx` reads `getColorMode()`; `light`/`dark` → `<html class="dark">` or none; `system` → no class plus the inline `COLOR_MODE_SCRIPT` as the first child of `<head>`. The script (plain JS string, under 1 KB): if `localStorage["nuxt-color-mode"]` holds `light|dark|system` and no `color-mode` cookie exists, write the cookie and remove the key, reload the page only if the migrated value isn't `system`; if the effective mode is `system`, add `.dark` when `matchMedia("(prefers-color-scheme: dark)").matches`. `theme-color` meta tags as in `app/app.vue`.
- [ ] **Step 3:** `ThemeToggle.tsx`: a `button.icon-button` cycling `system → light → dark → system` (order from `ThemeToggle.vue`), same `aria-label` (`Color scheme: <mode>. Activate to switch`) and `title`, writes `colorModeCookie`, toggles `.dark` on `document.documentElement`, follows `prefers-color-scheme` changes while `system`. State in a signal seeded from `props.initial`.
- [ ] **Step 4:** Temporarily place `<ThemeToggle>` on the placeholder page.
- [ ] **Step 5: Verify (Review Focus 2)**

Run: `curl -s -b 'color-mode=dark' localhost:3000/ | grep -o '<html[^>]*>'` → contains `class="dark"`.
Run: `curl -s -b 'color-mode=light' localhost:3000/ | grep -c 'prefers-color-scheme'` → `0` (no script needed).
Run: `curl -s -b 'color-mode=foo' localhost:3000/ | grep -c 'prefers-color-scheme'` → `1` (garbage treated as system).
Run: `curl -s localhost:3000/ | grep -c 'prefers-color-scheme'` → `1`.
In the browser (dark OS setting, no cookie): no light flash on reload; clicking cycles and survives a reload; with `localStorage.setItem("nuxt-color-mode","dark")` and no cookie, a reload ends in dark with the cookie set and the key gone.

- [ ] **Step 6:** Commit "Remember the color mode in a cookie".

### Task 2b: TypeScript 7 and type-aware oxlint (added by Christoph, 2026-11-09)

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml`, `.oxlintrc.json` (or the CLI flags in the `lint` script), `tsconfig.json` only if TS 7 requires it

**Requirements:**
- Upgrade `typescript` to exactly `7.0.2` (pinned, no `^`). `pnpm typecheck` keeps running `tsc --noEmit` (now the Go-native compiler) and passes.
- Add `oxlint-tsgolint` pinned to exactly `7.0.2006`; bump `oxlint` to exactly `1.93.0`. Enable type-aware linting (`--type-aware`) in `pnpm lint` / `lint:fix`. Do NOT add `--type-check` (tsc stays the separate typecheck).
- Type-aware lint covers only the new code (Nuxt sources stay ignored as in Task 1). Fix any new type-aware findings in the new code (`src/`, `env.ts`, `vite.config.ts`, `server/db`); rules may be disabled only with a one-line reason in `.oxlintrc.json`.
- Nuxt's own `typecheck`/`vue-tsc` is no longer used (scripts already switched in Task 1); if `vue-tsc` or Nuxt break with TS 7 at install time, note it — they are removed in Task 13 — but `pnpm dev`, `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm format:check` must all pass.

- [ ] **Step 1:** Upgrade and configure as above.
- [ ] **Step 2: Verify**
Run: `pnpm exec tsc --version` → `Version 7.0.2`.
Run: `pnpm typecheck && pnpm lint && pnpm format:check && pnpm build` → all exit 0; the lint output shows type-aware rules ran (e.g. state the tsgolint invocation/time in the report).
- [ ] **Step 3:** Commit "Typecheck with TypeScript 7 and lint with types".

### Task 3: Server data layer

**Files:**
- Create: `src/server/db.ts`, `src/server/http.ts`, `src/server/cv-content.ts`, `src/server/cv-content-body.ts`, `src/server/cv-variants.ts`, `src/server/cv-variant-body.ts`, `src/server/projects.ts`, `src/server/project-body.ts`, `src/server/cover-letters.ts`, `src/server/cover-letter-body.ts`, `src/server/pdf-pages.ts`, `src/server/cv-public-paths.ts`
- Create (moved, unchanged apart from imports): `src/data/*.ts` from `app/data/*.ts`; `src/lib/{format,cv-variant,cv-layout,cover-letter,desk-variant}.ts` from the pure `app/utils/*.ts`

**Interfaces:**
- Consumes: `env`, `BUILD_ID` (Task 1).
- Produces: every function the `server/utils` files export today, same names and signatures (e.g. `loadCvContent(): Promise<CvContent>`, `listVariants()`, `saveVariant(variant, { create })`, `printStoredVariant`, `storePageFills`, `markVariant`, `deleteVariant`, `listProjects`, `saveProject`, `listCoverLetters`, `saveCoverLetter`, `printCoverLetter`, `pageFills(data, margin)`, `points(mm)`, `publicPaths({ primary, website })`, `allPublicPaths()`, `parse*Body(...)`), plus from `src/server/http.ts`: `class HttpError extends Error { status: number }`, `notFound(message: string): HttpError`, `badRequest(message: string): HttpError`.

- [ ] **Step 1:** Each module starts with `import "server-only";`. `db.ts` reads `env.DATABASE_URL` (no `NUXT_DATABASE_URL`), keeps the `channel_binding` removal and `{ max: 1, prepare: false }`. `createError({ statusCode, message })` → `HttpError`; `useRuntimeConfig().app.buildId` → `BUILD_ID`. `allPublicPaths()` returns `["/api/cv-home", "/christoph-stach-cv.pdf", "/api/cv-website"]`; the website set is `["/api/cv-website"]` (`/` and `/curriculum` drop out, spec "Data, caching and revalidation").
- [ ] **Step 2:** Add a temporary `src/routes/api/_smoke.ts` `GET` returning `{ variants: (await listVariants()).variants.length, entries: (await loadCvContent()).experience.length }`.
- [ ] **Step 3: Verify**

Run: `curl -s localhost:3000/api/_smoke`
Expected: JSON with non-zero counts matching what the desk shows today (read-only against production).

- [ ] **Step 4:** Delete `_smoke.ts`; typecheck, lint, format; commit "Move the server data layer to src/server".

### Task 4: Public chrome, SEO and error pages

**Files:**
- Create: `src/components/AppHeader.tsx`, `src/components/AppFooter.tsx` (+ `.module.css`), `src/components/SiteLayout.tsx`, `src/seo.tsx`, `src/routes/[...404].tsx`, `src/components/ErrorPage.tsx`
- Modify: `src/App.tsx`, `src/Document.tsx`

**Interfaces:**
- Consumes: `ThemeToggle`, `getColorMode` (Task 2).
- Produces: `<SiteLayout>` (skip link, header, `<main id="main">`, footer; port of `app/layouts/default.vue`); `<SiteMeta title? ogTitle? noindex? />` emitting what `app/app.vue` + per-page `useSeoMeta` emit today (canonical from the request path, OG/Twitter, `og:locale`, `summary_large_image`, JSON-LD `Person` with `public/images/hero.png`); `<ErrorPage status={number} message={string} />` (port of `app/error.vue`).

- [ ] **Step 1:** Port the three components and the meta from the Vue files, styles into CSS Modules. Fonts: add `@fontsource/ibm-plex-sans` and `@fontsource/jetbrains-mono` (exact pins), import the static 400/500/600/700 weights in `main.css`, preload the two files `@nuxt/fonts` preloads today (compare `<link rel="preload">` in production HTML).
- [ ] **Step 2:** `<Errored>` in `App.tsx` renders `ErrorPage` with 500; `[...404].tsx` renders it with 404 and sets status 404 on the response.
- [ ] **Step 3: Verify**

Run: `curl -s -o /dev/null -w '%{http_code}' localhost:3000/nope` → `404`.
Run: diff of the `<head>` meta of `curl -s localhost:3000/` against `curl -s https://christophstach.de/` (ignore asset hashes and script tags): same tags and values.

- [ ] **Step 4:** Commit "Port the public chrome and metadata".

### Task 5: Home page and partial hydration

**Files:**
- Create: `src/routes/index.tsx` (replaces placeholder), `src/routes/api/cv-home.ts`, `src/components/home/*.tsx` as needed (+ `.module.css`)
- Reference: `app/pages/index.vue`, `server/api/cv-home.get.ts`

**Interfaces:**
- Consumes: `loadCvContent` (Task 3), `SiteLayout`, `SiteMeta` (Task 4), `monthsBetween`, `formatMonth` (Task 3).
- Produces: `GET /api/cv-home` → `{ experience: { from: string; to?: string; organization: string }[]; skills: SkillGroup[] }` (same body as today); `fetchPublic<T>(path: string): Promise<T>` in `src/server/fetch-public.ts` (server-only: `fetch(new URL(path, origin of getRequestEvent().request.url))`, throws `HttpError` on non-OK).

- [ ] **Step 1:** API route with the same body as `server/api/cv-home.get.ts`.
- [ ] **Step 2: Decide the hydration mechanism.** Build the page as a server route component: `serverRouteComponent(query(homeView, "home"))` where `homeView` is a `'use server'` function that calls `fetchPublic("/api/cv-home")` and returns the page markup; the theme toggle sits in the client layout (header), outside the server component. Load `@solidjs/web#server-components` first.
- [ ] **Step 3: Verify the mechanism**

Run: `curl -s localhost:3000/ > /tmp/home.html; grep -o '<script[^>]*src="[^"]*"' /tmp/home.html` and inspect the network panel.
Expected: the page content carries no hydration keys and its code isn't in the client bundle (search the built client chunks for a unique string from the home copy: not found); the toggle works. If only full-page hydration works, stop and ask Christoph (spec: full-page hydration needs his OK).

- [ ] **Step 4:** Port the page markup and styles; CSS-only scroll reveals unchanged; images from `public/images/`.
- [ ] **Step 5: Verify parity**

Screenshots of `localhost:3000/` and `https://christophstach.de/` at 390×844 and 1440×900, light and dark (`google-chrome --headless=new --screenshot --window-size=...`, dark via cookie `color-mode=dark` on local; via DevTools emulation on production). Expected: visually identical apart from data changes since the last deploy.

- [ ] **Step 6:** Commit "Port the home page".

### Task 6: Curriculum page

**Files:**
- Create: `src/routes/curriculum.tsx`, `src/routes/api/cv-website.ts`, `src/components/CvTimeline.tsx`, `src/components/CvText.tsx` (+ `.module.css`)
- Reference: `app/pages/curriculum.vue`, `app/components/CvTimeline.vue`, `app/components/CvText.vue`, `server/api/cv-website.get.ts`

**Interfaces:**
- Consumes: Task 5's mechanism and `fetchPublic`; `printVariant`, `requireMarkedVariant`, `loadCvContent`, `textParts`.
- Produces: `GET /api/cv-website` (same body as today); `<CvTimeline entries={TimelineEntry[]} />`; `<CvText text={string} />` (renders `[text](https://…)` as links, everything else as text).

- [ ] **Step 1:** Port with the same mechanism as Task 5; the download link to `/christoph-stach-cv.pdf` stays.
- [ ] **Step 2: Verify** — same screenshot comparison as Task 5 Step 5 for `/curriculum`; `curl -s -b color-mode=dark localhost:3000/curriculum | grep -o '<html[^>]*>'` contains `class="dark"`.
- [ ] **Step 3:** Commit "Port the curriculum page".

### Task 7: Printed CV and the CV PDF

**Files:**
- Create: `src/routes/cv-print.tsx`, `src/components/CvDocument.tsx`, `src/components/CvHead.tsx` (+ `.module.css`, keeping the `@page` and break rules), `src/server/cv-pdf.ts`, `src/routes/christoph-stach-cv.pdf.ts`
- Reference: `app/pages/cv-print.vue`, `app/components/CvDocument.vue`, `app/components/CvHead.vue`, `server/utils/cv-pdf.ts`, `server/routes/christoph-stach-cv.pdf.get.ts`, `server/api/cv-print.get.ts`

**Interfaces:**
- Consumes: `printVariant`, `requireMarkedVariant`, `loadCvContent`, `CV_LAYOUT_STEPS`, `CvText`.
- Produces: `<CvDocument cv={PrintedCv} layout={CvLayout} />` (sets `--cv-space`, `--cv-scale`, `@page` margin as today); `renderPdf(request: Request, path: string, withSession?: boolean): Promise<Uint8Array>`; `revalidatePaths(request: Request, paths: string[]): Promise<void>` (HEAD with `x-prerender-revalidate: env.ISR_BYPASS_TOKEN`, no-op without token); a `getCvPrint` query (`'use server'`) for the page.

- [ ] **Step 1:** `/cv-print` renders the primary variant, `noindex` (meta and `X-Robots-Tag` via route rules in Task 11); it may hydrate fully (no visitors).
- [ ] **Step 2:** `cv-pdf.ts`: same queueing (one Chrome at a time, in-flight sharing per URL), `CV_PDF_CHROME_PATH` instead of `NUXT_CV_PDF_CHROME`, cookies from the request's `cookie` header when `withSession`.
- [ ] **Step 3:** PDF route returns `new Response(pdf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": 'inline; filename="christoph-stach-cv.pdf"' } })`.
- [ ] **Step 4: Verify (Review Focus 4)**

Run: `curl -s localhost:3000/christoph-stach-cv.pdf -o /tmp/new.pdf & curl -s localhost:3000/christoph-stach-cv.pdf -o /tmp/new2.pdf & wait; curl -s https://christophstach.de/christoph-stach-cv.pdf -o /tmp/old.pdf`
Then: `pdfinfo /tmp/new.pdf | grep Pages` equals `pdfinfo /tmp/old.pdf | grep Pages`; `pdffonts /tmp/new.pdf` lists IBM Plex Sans / JetBrains Mono as embedded, none `Type 3`; `pdftotext` of both differ only where data changed; page images (`pdftoppm -r 50`) show the same breaks; both parallel downloads succeed.

- [ ] **Step 5:** Commit "Print the CV from Solid".

### Task 8: Sessions, GitHub login and the desk guard

**Files:**
- Create: `src/server/session.ts`, `src/server/auth.ts`, `src/routes/auth/github.ts`, `src/routes/login.tsx` (+ `.module.css`), `src/lib/auth.ts`
- Modify: `src/middleware.ts`
- Reference: `server/routes/auth/github.get.ts`, `app/pages/login.vue`, `app/middleware/desk.global.ts`, `shared/types/auth.d.ts`

**Interfaces:**
- Produces: `interface DeskUser { githubId: number; login: string; avatarUrl: string }`; `getSession(): Promise<{ user: DeskUser } | null>`, `setSession(data: { user: DeskUser }): Promise<void>`, `clearSession(): Promise<void>` (template's `session.ts`, cookie `session`, 7 days, HttpOnly, Secure; browsers accept Secure cookies on `http://localhost`); `requireUser(): Promise<DeskUser>` in `src/server/auth.ts` (throws `HttpError(401)`); `getCurrentUser` query and `logout` action in `src/lib/auth.ts`.

- [ ] **Step 1:** `GET /auth/github` without `code`: set a short-lived signed `oauth-state` cookie, redirect to `https://github.com/login/oauth/authorize?client_id=…&state=…&scope=` (no scopes, as today). With `code`: verify `state` against the cookie, exchange the code at `https://github.com/login/oauth/access_token`, fetch `https://api.github.com/user`, compare `id` with `Number(env.DESK_GITHUB_USER_ID)`; match → `setSession`, redirect `/desk`; other account → `/login?error=forbidden`; any failure → `/login?error=oauth`.
- [ ] **Step 2:** Middleware: `/desk` and `/desk/**` without session → 302 `/login`; `/login` with session → 302 `/desk`; add `X-Robots-Tag: noindex, nofollow` on `/desk/**` and `/login` responses.
- [ ] **Step 3:** Login page ported (error messages for `forbidden`/`oauth` as today).
- [ ] **Step 4: Verify (Review Focus 1 and 3)**

Run: `curl -s -o /dev/null -w '%{http_code} %{redirect_url}' localhost:3000/desk` → `302 …/login`.
Run: `curl -s -o /dev/null -w '%{redirect_url}' 'localhost:3000/auth/github?code=x&state=forged'` → ends with `/login?error=oauth`.
Run: `curl -s -o /dev/null -w '%{redirect_url}' 'localhost:3000/auth/github?error=access_denied'` → ends with `/login?error=oauth`.
In the browser: log in with Christoph's account → `/desk`. (Forbidden path: temporarily set `DESK_GITHUB_USER_ID=1` locally, log in → `/login?error=forbidden`, restore.)
The unauthenticated server-function check runs in Task 9 Step 4, once desk functions exist.

- [ ] **Step 5:** Commit "Log into the desk with GitHub".

### Task 9: Desk shell, shared desk components and overview

**Files:**
- Create: `src/routes/desk.tsx` (layout: sidebar, collapse, sign-out), `src/routes/desk/index.tsx`, `src/data/desk.ts` (moved), `src/lib/desk/queries.ts`, `src/lib/desk/actions.ts` (grown by later tasks), `src/components/desk/{DeskFormSection,DeskSaveBar,DeskMenu,DeskPickList}.tsx` (+ `.module.css`), `src/lib/drag-reorder.ts`, `src/lib/desk-unsaved.ts`, `src/lib/desk-page-checks.ts`
- Reference: `app/layouts/desk.vue`, `app/pages/desk/index.vue`, the four Vue components, `app/utils/{drag-reorder,desk-unsaved,desk-page-checks,desk-request}.ts`

**Interfaces:**
- Consumes: `requireUser` (Task 8), Task 3 server functions.
- Produces queries (all `'use server'`, all start with `await requireUser()`), keys replacing today's `useFetch` keys: `getDeskVariants` (`"desk-cv-variants"`, returns what `/api/desk/cv-variants` returns today), `getDeskCoverLetters` (`"desk-cover-letters"`), `getDeskContent` (`"desk-cv-content"`), `getDeskProjects` (`"desk-projects"`), `getDeskProfile` (`"desk-profile"`). `useDragReorder(read: () => string[], write: (ids: string[]) => void)` same contract as today; `useUnsavedGuard(dirty: () => boolean): { leave(): void }` built on `useBeforeLeave` + `beforeunload`; `usePageChecks(): { checkMissing(variants: { id: string; pageFills: number[] }[]): void; running: () => string[] }`; `errorMessage(error: unknown): string`.

- [ ] **Step 1:** Port the layout, the shared components and the overview, sidebar data from `src/data/desk.ts` (icons as components from `icons.tsx`).
- [ ] **Step 2:** `logout` action from the sidebar's sign-out row, then navigate to `/login`.
- [ ] **Step 3:** Desk pages hydrate fully (normal SSR + hydration).
- [ ] **Step 4: Verify (Review Focus 1)**

In the browser: overview shows the same counts and lists as production; collapse persists as today; sign-out works.
Run: copy a `getDeskVariants` request from the network panel as cURL, strip the `cookie` header, run it → `401` (not data).

- [ ] **Step 5:** Commit "Port the desk shell and overview".

### Task 10: Desk CV content editors

**Files:**
- Create: `src/routes/desk/cv/profile.tsx`, `src/routes/desk/cv/skills.tsx`, `src/routes/desk/cv/{experience,education}/{index,[id]}.tsx`, `src/routes/desk/cv/projects/{index,[id]}.tsx`, `src/components/desk/{DeskEntryList,DeskEntryEditor}.tsx` (+ `.module.css`)
- Modify: `src/lib/desk/actions.ts`
- Reference: the matching Vue pages/components, `server/api/desk/{profile,skill-groups,cv-entries,projects}/*`

**Interfaces:**
- Consumes: Task 9 queries, components and guards; Task 3 `save*`, `delete*`, `parse*Body`, `revalidatePaths`, `allPublicPaths`.
- Produces actions (`'use server'`, `requireUser()` first, body parsed with today's `parse*Body`, then `revalidatePaths(allPublicPaths())` exactly where today's handlers call it): `saveProfile`, `saveSkillGroups`, `createEntry`, `saveEntry`, `deleteEntry`, `createProject`, `saveProject`, `deleteProject`. After each write the affected query keys revalidate (`desk-cv-content`, `desk-projects`, `desk-cv-variants`, `desk-profile`).

- [ ] **Step 1:** Port pages and actions; `useUnsavedGuard` on every editor; `leave()` before navigating after save/delete.
- [ ] **Step 2: Verify (Review Focus 5)** — locally against production data, throwaway only: create entry "zz-test" in experience with two bullets, reorder bullets, save, see it in the list; edit a field and click another sidebar link → confirm dialog; cancel; save → no dialog; delete "zz-test" → no dialog, gone. Same for a project "zz-test". Profile and skills: open, save unchanged → success, no data diff (`git`-free check: reload shows identical values).
- [ ] **Step 3:** Commit "Port the desk CV content editors".

### Task 11: Desk CV variants, page checks and route rules

**Files:**
- Create: `src/routes/desk/cv/index.tsx`, `src/routes/desk/cv/[variant].tsx`, `src/routes/desk/cv-print/[variant].tsx`, `src/routes/api/desk/cv/[variant].ts`, `src/components/desk/{DeskVariantPicks,DeskCvLayout,DeskCvPdf,DeskPageSheets}.tsx` (+ `.module.css`), `src/server/cv-page-check.ts`
- Modify: `src/lib/desk/actions.ts`, `src/lib/desk/queries.ts`, `vite.config.ts` (Nitro `routeRules`, `vercel` options)
- Reference: matching Vue files, `server/api/desk/cv-variants/**`, `server/api/desk/cv-pdf.get.ts`, `server/api/desk/cv/[variant].get.ts`, `nuxt.config.ts`

**Interfaces:**
- Consumes: Tasks 3, 7, 9.
- Produces: actions `createVariant`, `saveVariant`, `deleteVariant`, `markPrimary`, `markWebsite` (revalidation as in today's handlers via `publicPaths`); query `checkVariantPages(id: string, layout?: CvLayout)` (`'use server'`, port of `cv-pdf.get.ts`: trial when layout differs, otherwise stored fills; the primary is read from `/christoph-stach-cv.pdf`); `GET /api/desk/cv/[variant]` (session required, JSON as today).
- Route rules (Nitro, port of `nuxt.config.ts` adjusted by the spec): `/api/cv-home`, `/api/cv-website`, `/christoph-stach-cv.pdf` → `isr: true`; `/cv-print`, `/desk/**`, `/login` → `X-Robots-Tag: noindex, nofollow`; `/about-me` → 301 `/`; `vercel.config.bypassToken = process.env.ISR_BYPASS_TOKEN`; `vercel.functions.maxDuration = 60`. No ISR on `/` and `/curriculum`.

- [ ] **Step 1:** Port pages, components and actions; the page checks after a deploy run from the desk layout via `usePageChecks` as today.
- [ ] **Step 2:** Route rules and Vercel options.
- [ ] **Step 3: Verify**

Locally, throwaway only: duplicate an existing variant as "zz-test", change picks and layout steps, "Check pages" (trial, not stored), save, check again (stored), make it primary → `/cv-print` shows it, make the original primary again, same for website and `/curriculum`, delete "zz-test".
Run: `curl -s -o /dev/null -w '%{http_code}' localhost:3000/api/desk/cv/<id>` without cookie → `401`.
Run: `curl -s -o /dev/null -w '%{http_code} %{redirect_url}' localhost:3000/about-me` → `301 …/`.
Run: `pnpm build && jq . .vercel/output/config.json` and `ls .vercel/output/functions/**/*.prerender-config.json` → prerender configs exactly for `/api/cv-home`, `/api/cv-website`, `/christoph-stach-cv.pdf` with the bypass token when `ISR_BYPASS_TOKEN` is set at build; `maxDuration: 60` in the function config; none for `/` or `/curriculum`.

- [ ] **Step 4:** Commit "Port the desk CV variants and route rules".

### Task 12: Cover letters

**Files:**
- Create: `src/routes/desk/cover-letters/{index,[id]}.tsx`, `src/routes/desk/cover-letter-print/[id].tsx`, `src/routes/api/desk/cover-letters/[id]/pdf.ts`, `src/components/CoverLetterDocument.tsx`, `src/components/desk/DeskCoverLetterPages.tsx` (+ `.module.css`)
- Modify: `src/lib/desk/actions.ts`, `src/lib/desk/queries.ts`
- Reference: matching Vue files, `server/api/desk/cover-letters/**`

**Interfaces:**
- Consumes: Tasks 3, 7 (`renderPdf`), 9.
- Produces: actions `createCoverLetter`, `saveCoverLetter`, `deleteCoverLetter`; query `checkLetterPages(id: string)` (port of `pages.get.ts`, stores fills); `GET /api/desk/cover-letters/[id]/pdf` (session required, `Content-Disposition` as today).

- [ ] **Step 1:** Port; the live preview in the editor uses `CoverLetterDocument` with `CvHead`.
- [ ] **Step 2: Verify** — throwaway letter "zz-test" in `en`, then switch to `de` (date format and wording change), check pages (one page, no warning), download PDF, duplicate it, delete both.
- [ ] **Step 3:** Commit "Port the cover letters".

### Task 13: Remove Nuxt and update the docs

**Files:**
- Delete: `app/`, `server/api/`, `server/routes/`, `server/utils/`, `shared/`, `nuxt.config.ts`, `tsconfig` references to them
- Modify: `package.json` (remove `nuxt`, `vue`, `vue-router`, `vue-tsc`, `@nuxt/*`, `@nuxtjs/*`, `nuxt-auth-utils`, `@iconify-json/tabler`, `std-env` if unused), `.oxlintrc.json`, `.gitignore` (`.nuxt` → `.vercel`, `.output`), `.env.example`, `CLAUDE.md`, `README.md`, `DESIGN.md` (stack references only), `drizzle.config.ts` (unchanged paths; check)

- [ ] **Step 1:** Delete and uninstall; `pnpm install`; `pnpm exec intent list` still shows the five Solid skills.
- [ ] **Step 2:** `.env.example` with the new names and today's comments adapted. `CLAUDE.md` rewritten for the new stack (same sections; the Intent block stays, moved near the top as Intent recommends), `README.md` likewise.
- [ ] **Step 3: Verify**

Run: `grep -rn "NUXT_\|nuxt\|\.vue" --exclude-dir=node_modules --exclude-dir=docs --exclude-dir=.git .` → no hits except the `nuxt-color-mode` migration key and its comment.
Run: `pnpm typecheck && pnpm lint && pnpm format:check && pnpm build` → all pass.

- [ ] **Step 4:** Commit "Remove Nuxt".

### Task 14: Final verification

- [ ] **Step 1:** Spec "Verification" 1–6 end to end on a fresh `pnpm build && pnpm preview` (production build locally): lint/format/typecheck/build; dev run with the `agent-loops` skill shows no Solid diagnostic codes on `/`, `/curriculum`, `/desk`, a variant editor and a cover letter editor; HTML/meta parity and screenshots (Tasks 4–6); PDF parity (Task 7); desk walkthrough with throwaway records (Tasks 10–12); build output ISR config (Task 11); `color-mode` cookie on `/` and `/curriculum`.
- [ ] **Step 2:** Confirm no throwaway record is left: the desk lists contain no "zz-test".
- [ ] **Step 3:** Report to Christoph with what was checked; Vercel env vars and the merge stay with him (spec "Environment variables").
