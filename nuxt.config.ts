export default defineNuxtConfig({
  compatibilityDate: "2026-06-12",

  future: {
    compatibilityVersion: 5,
  },

  modules: ["@nuxtjs/color-mode", "@nuxt/fonts", "@nuxt/icon"],

  css: ["~/assets/css/main.css"],

  colorMode: {
    classSuffix: "",
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

  nitro: {
    // Re-enable Nitro auto-imports: @nuxt/icon's server handler still relies
    // on `#imports`, which compatibilityVersion 5 disables (nuxt/icon#467).
    imports: {},
  },

  routeRules: {
    "/": { prerender: true },
    "/curriculum": { prerender: true },
    "/about-me": { redirect: { to: "/", statusCode: 301 } },
  },
});
