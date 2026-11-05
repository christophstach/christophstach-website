<script setup lang="ts">
const description =
  "Christoph Stach is a senior software engineer based in Berlin with a strong background in web development, who owns the Python platform behind LLM agents at MBition (Mercedes-Benz).";

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
  ogImageAlt: "Christoph Stach — Senior Software Engineer based in Berlin",
  twitterCard: "summary_large_image",
  twitterImage: `${siteUrl}/images/og.png`,
});

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Christoph Stach",
  url: siteUrl,
  // Crawler-facing copy of the hero portrait, in a format every crawler reads.
  // Keep it in sync with public/images/hero.webp.
  image: `${siteUrl}/images/hero.png`,
  jobTitle: "Senior Software Engineer",
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
