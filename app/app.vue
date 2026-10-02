<script setup lang="ts">
const description =
  "Christoph Stach is a full-stack engineer based in Berlin with over a decade of experience building modern web applications with Vue/Nuxt and React/Next.js, and more recently Python backends for AI and LLM agents.";

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
  ogImage: `${siteUrl}/images/og.png`,
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogImageType: "image/png",
  ogImageAlt: "Christoph Stach — Senior Full-Stack Engineer based in Berlin",
  twitterCard: "summary_large_image",
  twitterImage: `${siteUrl}/images/og.png`,
});

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Christoph Stach",
  url: siteUrl,
  // Crawler-facing copy of the hero portrait: the bundled asset gets a hashed
  // URL, so this needs a stable one. Keep it in sync with assets/images/hero.webp.
  image: `${siteUrl}/images/hero.png`,
  jobTitle: "Senior Full-Stack Engineer",
  description,
  worksFor: { "@type": "Organization", name: "MBition GmbH (Mercedes-Benz)" },
  address: { "@type": "PostalAddress", addressLocality: "Berlin", addressCountry: "DE" },
  alumniOf: { "@type": "CollegeOrUniversity", name: "HTW Berlin" },
  knowsAbout: [
    "Vue",
    "Nuxt",
    "React",
    "Next.js",
    "Remix",
    "TypeScript",
    "Tailwind CSS",
    "Python",
    "NestJS",
    "Node.js",
    "LLM Agents",
    "Retrieval-Augmented Generation",
    "LangChain",
    "Model Context Protocol",
    "Agent-to-Agent Protocol",
    "PostgreSQL",
    "MongoDB",
    "Docker",
    "Kubernetes",
    "Continuous Integration",
  ],
  sameAs: [
    "https://www.linkedin.com/in/christoph-stach-7586b958",
    "https://github.com/christophstach",
  ],
};

const colorMode = useColorMode();

const themeColors = { light: "#f5f7f7", dark: "#080b0a" };

useHead({
  titleTemplate: (title) => (title ? `${title} · Christoph Stach` : "Christoph Stach"),
  link: [
    { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
    { rel: "canonical", href: () => canonicalUrl.value },
  ],
  script: [{ type: "application/ld+json", innerHTML: JSON.stringify(personJsonLd) }],
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
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
