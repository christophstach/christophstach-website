<script setup lang="ts">
const description =
  "Christoph Stach is a full-stack engineer based in Berlin with 10+ years of experience building modern web applications with Vue/Nuxt and React/Next.js, now building Python platform infrastructure for LLM agents.";

useSeoMeta({
  description,
  ogType: "website",
  ogSiteName: "Christoph Stach",
  ogDescription: description,
  ogImage: "https://christophstach.de/images/hero.png",
  twitterCard: "summary",
});

const colorMode = useColorMode();

const themeColors = { light: "#ffffff", dark: "#0a0a0a" };

useHead({
  titleTemplate: (title) => (title ? `${title} · Christoph Stach` : "Christoph Stach"),
  link: [{ rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
  meta: [
    // One tag per system scheme so the browser chrome is correct before
    // hydration. A manual preference overrides both reactively.
    {
      key: "theme-color-light",
      name: "theme-color",
      media: "(prefers-color-scheme: light)",
      content: () => (colorMode.value === "dark" ? themeColors.dark : themeColors.light),
    },
    {
      key: "theme-color-dark",
      name: "theme-color",
      media: "(prefers-color-scheme: dark)",
      content: () => (colorMode.value === "light" ? themeColors.light : themeColors.dark),
    },
  ],
});
</script>

<template>
  <div class="layout">
    <AppHeader />

    <main class="layout__main">
      <NuxtPage />
    </main>

    <AppFooter />
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
}

.layout__main {
  flex: 1;
}
</style>
