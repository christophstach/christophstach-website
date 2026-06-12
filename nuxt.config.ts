export default defineNuxtConfig({
  compatibilityDate: "2026-06-12",

  future: {
    compatibilityVersion: 5,
  },

  modules: ["@nuxtjs/color-mode", "@nuxt/fonts"],

  css: ["~/assets/css/main.css"],

  colorMode: {
    classSuffix: "",
  },

  app: {
    head: {
      htmlAttrs: { lang: "en" },
    },
  },

  routeRules: {
    "/": { prerender: true },
    "/curriculum": { prerender: true },
    "/about-me": { redirect: { to: "/", statusCode: 301 } },
  },
});
