<script setup lang="ts">
const description =
  "Christoph Stach is a full-stack engineer based in Berlin with 10+ years of experience building modern web applications with Vue/Nuxt and React/Next.js, and more recently Python backends for AI and LLM agents.";

const siteUrl = "https://christophstach.de";
const route = useRoute();
const canonicalUrl = computed(() => `${siteUrl}${route.path}`);

useSeoMeta({
  description,
  ogType: "website",
  ogSiteName: "Christoph Stach",
  ogTitle: "Christoph Stach",
  ogDescription: description,
  ogUrl: () => canonicalUrl.value,
  ogLocale: "en_US",
  ogImage: "https://christophstach.de/images/hero.png",
  twitterCard: "summary",
});

const colorMode = useColorMode();

const themeColors = { light: "#f5f7f7", dark: "#080b0a" };

useHead({
  titleTemplate: (title) => (title ? `${title} · Christoph Stach` : "Christoph Stach"),
  link: [
    { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
    { rel: "canonical", href: () => canonicalUrl.value },
  ],
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
    <a class="skip-link" href="#main">Skip to content</a>

    <AppHeader />

    <main id="main" class="layout__main" tabindex="-1">
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

.layout__main:focus {
  outline: none;
}

/* Visible only when focused, so keyboard users can bypass the header nav. */
.skip-link {
  position: fixed;
  top: var(--space-2);
  left: var(--space-2);
  z-index: calc(var(--z-header) + 1);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--color-heading);
  transform: translateY(calc(-100% - var(--space-4)));
  transition: transform var(--transition-fast);
}

.skip-link:focus-visible {
  transform: translateY(0);
}
</style>
