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
  },

  nitro: {
    // Re-enable Nitro auto-imports, which compatibilityVersion 5 disables:
    // nuxt-auth-utils registers its server utils only as auto-imports and its
    // runtime imports from `#imports`. (@nuxt/icon needed this too until it
    // dropped `#imports` from its server handler, nuxt/icon#467.)
    imports: {},
  },

  routeRules: {
    "/": { prerender: true },
    "/curriculum": { prerender: true },
    "/cv-print": { prerender: true },
    "/about-me": { redirect: { to: "/", statusCode: 301 } },
    // Private, server-rendered behind a GitHub session (see app/middleware).
    "/desk/**": { headers: { "X-Robots-Tag": "noindex, nofollow" } },
    "/login": { headers: { "X-Robots-Tag": "noindex, nofollow" } },
  },
});
