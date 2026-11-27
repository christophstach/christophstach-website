# christophstach.de

Personal CV website of Christoph Stach, built with [Solid 2](https://v2.solidjs.com) in the SSR start mode of `@solidjs/vite-plugin`, Nitro 3 (RC), and a hand-rolled pure-CSS design system.

## Tech stack

- **Solid 2** — TSX with fine-grained reactivity, no virtual DOM; file-based routing (`filesystem-routing` + `@solidjs/router`), `"use server"` server components and functions for data
- **Vite 8 + Nitro 3 (RC)** — streaming-free async SSR, deployed to Vercel; public pages (`/`, `/curriculum`), `/sitemap.xml`, public CV JSON endpoints, and the CV PDF are cached at the edge with ISR
- **Postgres and Drizzle** — CV content and CVs, edited in the private `/desk` and printed to PDF
- **GitHub OAuth** — sealed-cookie sessions for `/desk` from Nitro's h3
- **Effect v4 (`effect/Schema`)** — validates the environment and every external input, and powers typed server effects and error handling
- **Pure CSS design system** — design tokens in `src/assets/css/tokens.css` (primitives + semantic aliases), reset in `base.css`, shared component classes in `components.css`, desk-only styles and forms split into `desk.css`, and a CSS Module per component
- **Dark mode** — a `color-mode` cookie resolved by an inline blocking head script before first paint so SSR stays cookie-independent for Edge-ISR; semantic token overrides on `.dark`
- **Fontsource** — self-hosted IBM Plex Sans and JetBrains Mono (latin + latin-ext subsets in static weights)
- **TypeScript 7, oxlint (type-aware) / oxfmt, `node:test`** — typechecking, linting, formatting, and zero-dependency unit tests

## Development

```bash
pnpm install
cp .env.example .env   # fill in the database and the GitHub OAuth app for /desk
pnpm dev
```

## Other scripts

```bash
pnpm build          # production build to .vercel/output, used by Vercel
pnpm vercel-build   # drizzle-kit migrate && vite build (Vercel deploy command)
pnpm preview        # preview the production build
pnpm test           # zero-dependency unit tests via node:test (tests/*.test.ts)
pnpm lint           # oxlint with type-aware rules
pnpm lint:fix       # oxlint with automatic fixes
pnpm format         # oxfmt
pnpm format:check   # check formatting without writing files
pnpm typecheck      # tsc (TypeScript 7)
pnpm a11y           # axe-core WCAG 2.1 AA audit across light/dark and desktop/mobile
pnpm db:generate    # generate a migration after changing server/db/schema.ts
pnpm db:migrate     # apply migrations
```
