<script setup lang="ts">
import { CV_LAYOUT_STEPS } from "~/data/cv-print-layout";
import type { PrintedCv } from "~/utils/cv-variant";
import { computed } from "vue";
import { useHead } from "nuxt/app";

// The printed CV for every variant. Variants change the content passed in and
// pick layout steps; this template and its print styles are the one design
// they all share.
const { cv } = defineProps<{ cv: PrintedCv }>();

// The layout steps reach the styles as two factors: --cv-space for the
// vertical rhythm, --cv-scale for every type size (1 at the 13px the styles
// are written for; the step is in pt, and 1pt is 4/3px).
const layoutVars = computed(() => ({
  "--cv-space": String(CV_LAYOUT_STEPS.spacing[cv.layout.spacing]),
  "--cv-scale": String((CV_LAYOUT_STEPS.textSize[cv.layout.textSize] * 4) / 3 / 13),
}));

// Custom properties don't reach @page, so the margin is a rule of its own.
useHead({
  style: [
    {
      key: "cv-page",
      textContent: () =>
        `@page { size: A4; margin: ${CV_LAYOUT_STEPS.margin[cv.layout.margin]}mm; }`,
    },
  ],
});

function stripScheme(url: string): string {
  return url.replace(/^https?:\/\//u, "");
}

function period(from: string, to?: string): string {
  return `${formatMonth(from)} – ${to ? formatMonth(to) : "Present"}`;
}
</script>

<template>
  <article class="cv" :style="layoutVars">
    <header class="cv__header">
      <h1 class="cv__name">{{ cv.profile.name }}</h1>
      <p v-if="cv.role" class="cv__role">{{ cv.role }}</p>
      <p v-if="cv.summary" class="cv__summary">{{ cv.summary }}</p>
      <p v-if="cv.coreTechnologies.length" class="cv__core cv__tags">
        <span v-for="tech in cv.coreTechnologies" :key="tech">{{ tech }}</span>
      </p>
      <ul class="cv__contact">
        <li>{{ cv.profile.location }}</li>
        <li>{{ cv.profile.email }}</li>
        <li>{{ cv.profile.phone }}</li>
      </ul>
      <ul class="cv__contact cv__contact--links">
        <li v-for="link in cv.profile.links" :key="link.href">{{ stripScheme(link.href) }}</li>
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
          <div v-if="entry.tech?.length" class="cv__tech cv__tags">
            <span v-for="tech in entry.tech" :key="tech">{{ tech }}</span>
          </div>
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
    <section v-if="cv.projects.length" class="cv__section">
      <h2 class="cv__section-title">Projects</h2>
      <div v-for="project in cv.projects" :key="project.id" class="cv__entry cv__item">
        <div class="cv__item-row">
          <h3 class="cv__item-title">{{ project.title }}</h3>
          <span v-if="project.url" class="cv__period">{{ stripScheme(project.url) }}</span>
        </div>
        <div v-if="project.description" class="cv__details">{{ project.description }}</div>
        <div v-if="project.tech.length" class="cv__tech cv__tags">
          <span v-for="tech in project.tech" :key="tech">{{ tech }}</span>
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
  --cv-space: 1;
  --cv-scale: 1;
  /* The spacing step opens the lines a little too, so a looser page keeps
     one rhythm instead of tight paragraphs between wide gaps. It never closes
     them: lines this long need the 1.5 to stay readable. */
  --cv-leading: calc(1.5 + max(var(--cv-space) - 1, 0) * 0.2);

  font-family: "IBM Plex Sans", system-ui, sans-serif;
  font-size: calc(13px * var(--cv-scale));
  line-height: var(--cv-leading);
  color: var(--cv-text);
}

.cv__header {
  padding-bottom: calc(16px * var(--cv-space));
  margin-bottom: calc(28px * var(--cv-space));
  border-bottom: 2px solid var(--cv-accent);
}

.cv__name {
  font-family: inherit;
  font-size: calc(30px * var(--cv-scale));
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.01em;
  color: inherit;
}

.cv__role {
  margin-top: calc(4px * var(--cv-space));
  font-size: calc(15px * var(--cv-scale));
  font-weight: 500;
  color: var(--cv-accent);
}

.cv__summary {
  margin-top: calc(6px * var(--cv-space));
  color: var(--cv-soft);
}

.cv__core {
  margin-top: calc(6px * var(--cv-space));
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: calc(10.5px * var(--cv-scale));
  color: var(--cv-accent);
}

.cv__contact {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 0;
  padding: 0;
  margin-top: calc(10px * var(--cv-space));
  list-style: none;
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: calc(10.5px * var(--cv-scale));
  color: var(--cv-soft);
}

.cv__contact--links {
  margin-top: 2px;
}

/* Technology lists: each name stays whole, and a line never starts with a
   separator, which a joined string can't promise. */
.cv__tags {
  display: flex;
  flex-wrap: wrap;
}

.cv__tags > span {
  white-space: nowrap;
}

.cv__tags > span:not(:last-child)::after {
  content: "·";
  margin-inline: 0.55em;
  color: var(--cv-muted);
}

/* After the item, not before the next: a wrapped line never starts with one. */
.cv__contact li:not(:last-child)::after {
  content: "·";
  margin-inline: 8px;
  color: var(--cv-muted);
}

.cv__section {
  margin-bottom: calc(28px * var(--cv-space));
}

/* A trailing margin still occupies space when paginating, which is enough to
   push the last entry onto a page of its own. */
.cv__section:last-child {
  margin-bottom: 0;
}

/* The site's section label: mono, accent, behind a muted "// ". */
.cv__section-title {
  padding-bottom: 5px;
  margin-bottom: calc(14px * var(--cv-space));
  border-bottom: 1px solid var(--cv-rule);
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: calc(11.5px * var(--cv-scale));
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
  grid-template-columns: calc(150px * var(--cv-scale)) 1fr;
  gap: 12px;
}

.cv__skill + .cv__skill {
  margin-top: calc(4px * var(--cv-space));
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
  margin-top: calc(24px * var(--cv-space));
}

.cv__item-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
}

.cv__item-title {
  font-family: inherit;
  font-size: calc(15px * var(--cv-scale));
  font-weight: 600;
  line-height: 1.35;
  color: inherit;
}

.cv__period {
  flex-shrink: 0;
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: calc(10.5px * var(--cv-scale));
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
  margin-top: calc(5px * var(--cv-space));
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: calc(10px * var(--cv-scale));
  line-height: 1.5;
  color: var(--cv-muted);
}

.cv__details {
  margin-top: calc(4px * var(--cv-space));
  color: var(--cv-soft);
  text-wrap: pretty;
}

.cv__bullets {
  padding-left: 16px;
  margin-top: calc(10px * var(--cv-space));
  list-style: none;
}

.cv__bullets li {
  position: relative;
  color: var(--cv-soft);
  text-wrap: pretty;
}

.cv__bullets li::before {
  content: "";
  position: absolute;
  /* Centred on the first line, whatever the leading. */
  top: calc((var(--cv-leading) * 1em - 4px) / 2);
  left: -12px;
  width: 4px;
  height: 4px;
  background: var(--cv-accent);
}

.cv__bullets li + li {
  margin-top: calc(6px * var(--cv-space));
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
</style>
