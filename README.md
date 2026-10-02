# christophstach.de

Personal CV website of Christoph Stach, built with [Nuxt](https://nuxt.com) (nightly release channel) and a hand-rolled pure-CSS design system.

## Tech stack

- **Nuxt** — nightly channel (`nuxt-nightly@latest`); public pages prerendered, private `/desk` server-rendered on Vercel
- **nuxt-auth-utils** — GitHub OAuth and sealed-cookie sessions for `/desk`
- **Pure CSS design system** — design tokens in `app/assets/css/tokens.css` (primitives + semantic aliases), reset in `base.css`, shared component classes in `components.css`, scoped styles per Vue component
- **@nuxtjs/color-mode** — dark mode via semantic token overrides on `.dark`
- **@nuxt/fonts** — self-hosted Inter
- **oxlint / oxfmt** — linting and formatting

## Development

```bash
pnpm install
cp .env.example .env   # fill in the GitHub OAuth app and session password for /desk
pnpm dev
```

## Other scripts

```bash
pnpm build         # production build (prerendered pages + server), used by Vercel
pnpm generate      # static-only build to .output/public (no /desk)
pnpm preview       # preview the production build
pnpm lint          # oxlint
pnpm format        # oxfmt
pnpm typecheck     # vue-tsc via nuxt
```
