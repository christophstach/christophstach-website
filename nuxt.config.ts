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
      { name: "IBM Plex Sans", preload: true },
      { name: "JetBrains Mono", preload: true },
      // The CV PDF face (/cv-print), served from public/fonts/inter: the serverless
      // Chromium that renders the PDF has no system fonts to fall back on.
      {
        name: "Inter",
        provider: "local",
        weights: [400, 500, 600, 700],
        styles: ["normal", "italic"],
      },
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
  },

  nitro: {
    // Re-enable Nitro auto-imports, which compatibilityVersion 5 disables:
    // nuxt-auth-utils registers its server utils only as auto-imports and its
    // runtime imports from `#imports`. (@nuxt/icon needed this too until it
    // dropped `#imports` from its server handler, nuxt/icon#467.)
    imports: {},
    vercel: {
      functions: {
        // The CV PDF route unpacks and starts Chromium on a cold start, which
        // can outlast the plan's default function timeout.
        maxDuration: 60,
      },
    },
  },

  routeRules: {
    "/": { prerender: true },
    "/curriculum": { prerender: true },
    "/cv-print": { prerender: true },
    // Rendered from /cv-print by headless Chrome (server/routes) and cached until
    // the next deployment. Excluded from prerendering, which would otherwise crawl
    // the download links and need Chrome in the Vercel build.
    "/christoph-stach-cv.pdf": { prerender: false, isr: true },
    "/about-me": { redirect: { to: "/", statusCode: 301 } },
    // Private, server-rendered behind a GitHub session (see app/middleware).
    "/desk/**": { headers: { "X-Robots-Tag": "noindex, nofollow" } },
    "/login": { headers: { "X-Robots-Tag": "noindex, nofollow" } },
  },
});
