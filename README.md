# christophstach.de

Personal CV website of Christoph Stach, built with [Solid 2](https://v2.solidjs.com) (release candidate) in the SSR start mode of `@solidjs/vite-plugin`, and a hand-rolled pure-CSS design system.

## Tech stack

- **Solid 2** — TSX with fine-grained reactivity, no virtual DOM; file-based routing (`filesystem-routing` + `@solidjs/router`), `"use server"` functions for data
- **Vite 8 + Nitro 3** — streaming-free async SSR, deployed to Vercel; the public data and the CV PDF are cached with ISR, `/` and `/curriculum` render per request
- **Postgres and Drizzle** — CV content and CVs, edited in the private `/desk` and printed to PDF
- **GitHub OAuth** — sealed-cookie sessions for `/desk` from Nitro's h3
- **zod/mini** — validates the environment and every input that comes from outside
- **Pure CSS design system** — design tokens in `src/assets/css/tokens.css` (primitives + semantic aliases), reset in `base.css`, shared component classes in `components.css`, a CSS Module per component
- **Dark mode** — a `color-mode` cookie, read on the server; semantic token overrides on `.dark`
- **Fontsource** — self-hosted IBM Plex Sans and JetBrains Mono in static weights
- **TypeScript 7, oxlint (type-aware) / oxfmt** — typechecking, linting and formatting

## Development

```bash
pnpm install
cp .env.example .env   # fill in the database and the GitHub OAuth app for /desk
pnpm dev
```

## Other scripts

```bash
pnpm build         # production build to .vercel/output, used by Vercel
pnpm preview       # preview the production build
pnpm lint          # oxlint with type-aware rules
pnpm format        # oxfmt
pnpm typecheck     # tsc (TypeScript 7)
pnpm db:generate   # a migration after changing server/db/schema.ts
pnpm db:migrate    # apply migrations
```
