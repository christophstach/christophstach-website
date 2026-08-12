<script setup lang="ts">
import { education, experience, profile, skills } from "~/data/cv";

useSeoMeta({
  robots: "noindex, nofollow",
});

// Chrome writes the document title into the PDF's Title metadata, so this page
// opts out of the site-wide titleTemplate rather than repeating the name.
useHead({
  title: "CV - Christoph Stach",
  titleTemplate: "%s",
});

function stripScheme(url: string): string {
  return url.replace(/^https?:\/\//u, "");
}

function period(from: string, to?: string): string {
  return `${formatMonth(from)} - ${to ? formatMonth(to) : "Present"}`;
}
</script>

<template>
  <article class="cv">
    <header class="cv__header">
      <h1 class="cv__name">{{ profile.name }}</h1>
      <div class="cv__line">{{ profile.location }}</div>
      <div class="cv__line">{{ profile.email }} | {{ profile.phone }}</div>
      <div class="cv__links">
        <template v-for="(link, i) in profile.links" :key="link.href">
          <template v-if="i > 0"> | </template
          ><span class="cv__mono">{{ stripScheme(link.href) }}</span>
        </template>
      </div>
    </header>

    <section class="cv__section cv__section--tight">
      <h2 class="cv__section-title">Professional Summary</h2>
      <p class="cv__summary">{{ profile.summary }}</p>
      <p class="cv__italic">Core technologies: {{ profile.coreTechnologies.join(", ") }}</p>
    </section>

    <section class="cv__section cv__skills">
      <h2 class="cv__section-title cv__section-title--gap">Technical Skills</h2>
      <div v-for="group in skills" :key="group.label" class="cv__skill">
        <strong>{{ group.title }}:</strong>{{ " "
        }}<span class="cv__italic">{{ group.items.join(", ") }}</span>
      </div>
    </section>

    <section class="cv__section cv__section--loose">
      <h2 class="cv__section-title">Professional Experience</h2>
      <div v-for="entry in experience" :key="`${entry.organization}-${entry.from}`" class="cv__job">
        <h3 class="cv__entry-title">{{ entry.title }}</h3>
        <div>
          {{ entry.organization
          }}<template v-if="entry.location">, {{ entry.location }}</template> |
          {{ period(entry.from, entry.to) }}
        </div>
        <div v-if="entry.tech?.length" class="cv__italic cv__tech">
          Tech: {{ entry.tech.join(", ") }}
        </div>
        <ul v-if="bulletsFor('print', entry.bullets).length" class="cv__bullets">
          <li v-for="bullet in bulletsFor('print', entry.bullets)" :key="bullet">{{ bullet }}.</li>
        </ul>
      </div>
    </section>

    <section class="cv__section cv__section--loose">
      <h2 class="cv__section-title">Education</h2>
      <div
        v-for="entry in education"
        :key="`${entry.organization}-${entry.from}`"
        class="cv__entry"
      >
        <h3 class="cv__entry-title">{{ entry.title }}</h3>
        <div>{{ entry.organization }} | {{ period(entry.from, entry.to) }}</div>
        <div v-if="bulletsFor('print', entry.bullets).length" class="cv__italic cv__relaxed">
          {{ bulletsFor("print", entry.bullets).join(" | ") }}
        </div>
      </div>
    </section>
  </article>
</template>

<style scoped>
/* Mirrors the Tailwind/prose CV in the cv-english-nextjs repo, which is the
   canonical design for this document — values are its computed px, not tokens. */
.cv {
  font-family:
    "Inter",
    system-ui,
    -apple-system,
    sans-serif;
  font-size: 14px;
  line-height: 20px;
  /* The reference loads `prose` without @tailwindcss/typography installed, so it
     has no prose palette — everything simply inherits black. */
  color: #000000;
}

.cv__header {
  margin-bottom: 32px;
}

.cv__name {
  margin-bottom: 8px;
  font-family: inherit;
  font-size: 30px;
  font-weight: 700;
  line-height: 36px;
  color: inherit;
}

.cv__line {
  margin-bottom: 4px;
  font-weight: 500;
}

/* The separators sit outside the monospace runs, as in the reference. */
.cv__links {
  font-size: 12px;
  font-weight: 500;
  line-height: 16px;
}

/* Tailwind's `font-mono` stack, so the PDF picks the same face the reference did. */
.cv__mono {
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New",
    monospace;
}

.cv__section {
  margin-bottom: 32px;
}

/* A trailing margin still occupies space when paginating, which is enough to
   push the last entry onto a page of its own. */
.cv__section:last-child {
  margin-bottom: 0;
}

/* Block layout rather than flex + gap: Chrome fragments flex containers poorly
   when printing and pushes whole entries to the next page early. Same spacing. */
.cv__section--tight > * + * {
  margin-top: 12px;
}

.cv__section--loose > * + * {
  margin-top: 20px;
}

.cv__section-title {
  margin-bottom: 4px;
  padding-bottom: 6px;
  border-bottom: 1px solid currentColor;
  font-family: inherit;
  font-size: 20px;
  font-weight: 600;
  line-height: 28px;
  color: inherit;
  break-after: avoid;
}

.cv__section-title--gap {
  margin-bottom: 16px;
}

.cv__summary {
  line-height: 1.625;
  text-align: justify;
}

.cv__italic {
  font-style: italic;
}

.cv__skills {
  line-height: 1.625;
}

.cv__skill {
  margin-bottom: 8px;
}

.cv__entry {
  break-inside: avoid;
}

.cv__entry-title {
  font-family: inherit;
  font-size: 18px;
  font-weight: 600;
  line-height: 28px;
  color: inherit;
  break-after: avoid;
}

.cv__tech {
  margin-bottom: 8px;
  break-after: avoid;
}

.cv__relaxed {
  line-height: 1.625;
}

.cv__bullets {
  padding-left: 20px;
  line-height: 1.625;
  list-style: disc;
}

.cv__bullets li {
  break-inside: avoid;
}

.cv__bullets li + li {
  margin-top: 8px;
}

/* Puppeteer renders the reference with `format: A4, margin: 48` (48px = 12.7mm). */
@page {
  size: A4;
  margin: 12.7mm;
}
</style>
