export default defineNuxtConfig({
  compatibilityDate: "2026-06-12",

  future: {
    compatibilityVersion: 5,
  },

  modules: ["@nuxtjs/color-mode", "@nuxt/fonts", "@nuxt/icon", "nuxt-auth-utils"],

  css: ["~/assets/css/main.css"],

  colorMode: {
    classSuffix: "",
  },

  fonts: {
    families: [
      // Static weights from Fontsource: Chrome prints weights of a variable font
      // as Type3 in the CV PDF, which parsers may read worse than embedded fonts.
      { name: "IBM Plex Sans", provider: "fontsource", weights: [400, 500, 600, 700], preload: true },
      { name: "JetBrains Mono", provider: "fontsource", weights: [400, 500, 600, 700], preload: true },
    ],
  },

  icon: {
    // The theme toggle swaps icons client-side on a statically hosted site,
    // so its icons must ship in the client bundle instead of being fetched.
    clientBundle: {
      icons: ["tabler:sun", "tabler:moon", "tabler:device-desktop"],
      scan: true,
    },
  },

  app: {
    head: {
      htmlAttrs: { lang: "en" },
    },
  },

  runtimeConfig: {
    // Numeric GitHub user ID of the only account allowed into /desk.
    // Set via NUXT_DESK_GITHUB_ID.
    deskGithubId: "",
    // Chrome used for the CV PDF outside Vercel, e.g. the macOS app binary.
    // Unset, the route uses the serverless Chromium, which only runs on Linux.
    // Set via NUXT_CV_PDF_CHROME.
    cvPdfChrome: "",
    // Postgres holding the CV variants. Unset, server/utils/db.ts falls back to
    // DATABASE_URL, which Vercel's Neon integration sets. Set via NUXT_DATABASE_URL.
    databaseUrl: "",
    // Lets the desk renew the cached public CV PDF after the primary variant
    // changes. The same value goes into the Vercel build below. Set via
    // NUXT_ISR_BYPASS_TOKEN (at least 32 characters).
    isrBypassToken: "",
  },

  nitro: {
    // Re-enable Nitro auto-imports, which compatibilityVersion 5 disables:
    // nuxt-auth-utils registers its server utils only as auto-imports and its
    // runtime imports from `#imports`. (@nuxt/icon needed this too until it
    // dropped `#imports` from its server handler, nuxt/icon#467.)
    imports: {},
    vercel: {
      // Read at build time: Vercel only revalidates ISR routes on demand for
      // requests carrying this token (see revalidatePublicPdf).
      config: { bypassToken: process.env.NUXT_ISR_BYPASS_TOKEN },
      functions: {
        // The CV PDF route unpacks and starts Chromium on a cold start, which
        // can outlast the plan's default function timeout.
        maxDuration: 60,
      },
    },
  },

  routeRules: {
    // Server-rendered: it counts the jobs and shows the skill groups from the
    // database. Cached (ISR) until the next deployment or until the desk
    // changes CV content (on-demand revalidation).
    "/": { prerender: false, isr: true },
    "/api/cv-home": { isr: true },
    // Server-rendered from the website CV variant in the database and cached
    // (ISR) until the next deployment or until the desk changes that variant
    // (on-demand revalidation). Not prerendered: the home page links here.
    "/curriculum": { prerender: false, isr: true },
    "/api/cv-website": { isr: true },
    // Server-rendered: it prints the primary CV variant, which lives in the
    // database and changes without a deployment.
    "/cv-print": { headers: { "X-Robots-Tag": "noindex, nofollow" } },
    // Rendered from /cv-print by headless Chrome (server/routes) and cached until
    // the next deployment or until the desk changes the primary variant (on-demand
    // revalidation). Excluded from prerendering, which would otherwise crawl the
    // download links and need Chrome in the Vercel build.
    "/christoph-stach-cv.pdf": { prerender: false, isr: true },
    "/about-me": { redirect: { to: "/", statusCode: 301 } },
    // Private, server-rendered behind a GitHub session (see app/middleware).
    "/desk/**": { headers: { "X-Robots-Tag": "noindex, nofollow" } },
    "/login": { headers: { "X-Robots-Tag": "noindex, nofollow" } },
  },
});
