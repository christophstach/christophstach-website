<script setup lang="ts">
import type { PrintedCv } from "~/utils/cv-variant";
import { profile } from "~/data/cv";

// The printed CV for every variant. Variants only change the content passed
// in; this template and its print styles are the one layout they all share.
const { cv } = defineProps<{ cv: PrintedCv }>();

function stripScheme(url: string): string {
  return url.replace(/^https?:\/\//u, "");
}

function period(from: string, to?: string): string {
  return `${formatMonth(from)} – ${to ? formatMonth(to) : "Present"}`;
}
</script>

<template>
  <article class="cv">
    <header class="cv__header">
      <h1 class="cv__name">{{ profile.name }}</h1>
      <p class="cv__role">{{ cv.role }}</p>
      <p v-if="cv.summary" class="cv__summary">{{ cv.summary }}</p>
      <ul class="cv__contact">
        <li>{{ profile.location }}</li>
        <li>{{ profile.email }}</li>
        <li>{{ profile.phone }}</li>
      </ul>
      <ul class="cv__contact cv__contact--links">
        <li v-for="link in profile.links" :key="link.href">{{ stripScheme(link.href) }}</li>
      </ul>
    </header>

    <section v-if="cv.skills.length" class="cv__section">
      <h2 class="cv__section-title">Technical Skills</h2>
      <dl class="cv__skills">
        <div v-for="group in cv.skills" :key="group.label" class="cv__skill">
          <dt>{{ group.title }}</dt>
          <dd>{{ group.items.join(", ") }}</dd>
        </div>
      </dl>
    </section>

    <section class="cv__section">
      <h2 class="cv__section-title">Professional Experience</h2>
      <div v-for="entry in cv.experience" :key="entry.id" class="cv__job cv__item">
        <div class="cv__job-head">
          <div class="cv__item-row">
            <h3 class="cv__item-title">{{ entry.title }}</h3>
            <span class="cv__period">{{ period(entry.from, entry.to) }}</span>
          </div>
          <div class="cv__org">
            {{ entry.organization
            }}<span v-if="entry.location" class="cv__location"> · {{ entry.location }}</span>
          </div>
          <div v-if="entry.tech?.length" class="cv__tech">{{ entry.tech.join(" · ") }}</div>
        </div>
        <ul v-if="entry.bullets.length" class="cv__bullets">
          <li v-for="bullet in entry.bullets" :key="bullet">{{ bullet }}.</li>
        </ul>
      </div>
    </section>

    <section class="cv__section">
      <h2 class="cv__section-title">Education</h2>
      <div v-for="entry in cv.education" :key="entry.id" class="cv__entry cv__item">
        <div class="cv__item-row">
          <h3 class="cv__item-title">{{ entry.title }}</h3>
          <span class="cv__period">{{ period(entry.from, entry.to) }}</span>
        </div>
        <div class="cv__org">{{ entry.organization }}</div>
        <div v-if="entry.bullets.length" class="cv__details">
          {{ entry.bullets.join(" · ") }}
        </div>
      </div>
    </section>
  </article>
</template>

<style scoped>
/* The PDF's own look, matching the site: IBM Plex Sans for text, JetBrains Mono
   for labels and metadata, and the site's green as the one accent. It is
   always printed light, so it fixes its palette here instead of following the
   site's theme tokens. Sizes are px because the page is laid out for A4. */
.cv {
  --cv-text: #1b2321;
  --cv-soft: #45504d;
  --cv-muted: #6b7672;
  --cv-rule: #d6dcda;
  --cv-accent: #087a5e;

  font-family: "IBM Plex Sans", system-ui, sans-serif;
  font-size: 13px;
  line-height: 1.5;
  color: var(--cv-text);
}

.cv__header {
  padding-bottom: 16px;
  margin-bottom: 28px;
  border-bottom: 2px solid var(--cv-accent);
}

.cv__name {
  font-family: inherit;
  font-size: 30px;
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.01em;
  color: inherit;
}

.cv__role {
  margin-top: 4px;
  font-size: 15px;
  font-weight: 500;
  color: var(--cv-accent);
}

.cv__summary {
  margin-top: 6px;
  color: var(--cv-soft);
}

.cv__contact {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 0;
  padding: 0;
  margin-top: 10px;
  list-style: none;
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 10.5px;
  color: var(--cv-soft);
}

.cv__contact--links {
  margin-top: 2px;
}

.cv__contact li + li::before {
  content: "·";
  margin-inline: 8px;
  color: var(--cv-muted);
}

.cv__section {
  margin-bottom: 28px;
}

/* A trailing margin still occupies space when paginating, which is enough to
   push the last entry onto a page of its own. */
.cv__section:last-child {
  margin-bottom: 0;
}

/* The site's section label: mono, accent, behind a muted "// ". */
.cv__section-title {
  padding-bottom: 5px;
  margin-bottom: 14px;
  border-bottom: 1px solid var(--cv-rule);
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 11.5px;
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--cv-accent);
  break-after: avoid;
}

.cv__section-title::before {
  content: "// ";
  color: var(--cv-muted);
}

/* Skills read as a two-column table: category, then its items. */
.cv__skills {
  margin: 0;
}

.cv__skill {
  display: grid;
  grid-template-columns: 150px 1fr;
  gap: 12px;
}

.cv__skill + .cv__skill {
  margin-top: 4px;
}

.cv__skill dt {
  font-weight: 600;
}

.cv__skill dd {
  margin: 0;
  color: var(--cv-soft);
}

/* Block layout between entries rather than flex + gap: Chrome fragments flex
   containers poorly when printing and pushes whole entries to the next page
   early. Flex is fine inside an entry's head, which never breaks. */
.cv__item + .cv__item {
  margin-top: 24px;
}

.cv__item-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
}

.cv__item-title {
  font-family: inherit;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.35;
  color: inherit;
}

.cv__period {
  flex-shrink: 0;
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 10.5px;
  color: var(--cv-muted);
}

.cv__org {
  font-weight: 500;
  color: var(--cv-accent);
}

.cv__location {
  font-weight: 400;
  color: var(--cv-muted);
}

.cv__tech {
  margin-top: 5px;
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 10px;
  line-height: 1.5;
  color: var(--cv-muted);
}

.cv__details {
  margin-top: 4px;
  color: var(--cv-soft);
}

.cv__bullets {
  padding-left: 16px;
  margin-top: 10px;
  list-style: none;
}

.cv__bullets li {
  position: relative;
  color: var(--cv-soft);
}

.cv__bullets li::before {
  content: "";
  position: absolute;
  top: 0.62em;
  left: -12px;
  width: 4px;
  height: 4px;
  background: var(--cv-accent);
}

.cv__bullets li + li {
  margin-top: 6px;
}

/* Page breaks: the data changes often, so these rules decide where the PDF
   breaks instead of hand-tuned spacing. A job never breaks inside its header,
   never leaves the header or a single bullet alone on a page, and short jobs
   move to the next page whole. */
.cv__header,
.cv__skill,
.cv__entry,
.cv__job-head,
.cv__bullets li {
  break-inside: avoid;
}

.cv__job-head {
  break-after: avoid;
}

.cv__job:not(:has(.cv__bullets li:nth-child(4))) {
  break-inside: avoid;
}

.cv__bullets li:first-child,
.cv__bullets li:last-child {
  break-before: avoid;
}

@page {
  size: A4;
  margin: 18mm;
}
</style>
