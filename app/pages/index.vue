<script setup lang="ts">
import { cvDownloadVisible } from "~/data/cv-variants";
import { useFetch } from "nuxt/app";

useSeoMeta({
  title: "Senior Software Engineer in Berlin",
  ogTitle: "Christoph Stach, Senior Software Engineer in Berlin",
});

// Jobs and skill groups live in the database, edited in the desk; the page is
// cached with ISR and renewed when they change.
const { data: cv } = await useFetch("/api/cv-home");
const experience = cv.value?.experience ?? [];
const skills = cv.value?.skills ?? [];

const totalSkills = skills.reduce((sum, group) => sum + group.items.length, 0);

// Counted as time actually employed, so the career gap between SLH and DERICON is not billed as experience.
const monthsEmployed = experience.reduce(
  (sum, entry) => sum + monthsBetween(entry.from, entry.to),
  0,
);

// Whole decades only: part-time years make a more exact number overstate it.
const yearsEmployed = Math.floor(monthsEmployed / 120) * 10;

// A company with several roles on the CV counts once.
const companyCount = new Set(experience.map((entry) => entry.organization)).size;
</script>

<template>
  <div class="container">
    <section class="hero">
      <div class="hero__grid">
        <div class="terminal reveal">
          <div class="terminal__bar">
            <span class="terminal__dots" aria-hidden="true"> <i /><i /><i /> </span>
            <span class="terminal__path">christoph@berlin: ~</span>
          </div>

          <div class="terminal__body">
            <p class="terminal__cmd"><span class="terminal__prompt">$</span> whoami</p>
            <h1 class="hero__title">Christoph Stach</h1>
            <p class="hero__role">
              Senior Software Engineer<span class="hero__sep">//</span>Berlin<span class="hero__sep"
                >//</span
              >{{ yearsEmployed }}+ yrs
            </p>

            <p class="terminal__cmd"><span class="terminal__prompt">$</span> cat about.txt</p>
            <p class="hero__text">
              Senior software engineer with a strong background in
              <strong>web development</strong> who owned features across the full development cycle,
              enforced code quality and kept software maintainable. Built
              <strong>LLM agents</strong> and worked with AI coding tools. Experience across
              enterprise, mid-sized and startup environments.
            </p>

            <div class="hero__actions">
              <NuxtLink to="/curriculum" class="button button--primary">
                ./curriculum
                <Icon name="tabler:arrow-right" size="16" />
              </NuxtLink>

              <a
                v-if="cvDownloadVisible"
                href="/christoph-stach-cv.pdf"
                download
                class="button button--outline"
              >
                <Icon name="tabler:download" size="16" />
                cv.pdf
              </a>

              <a
                href="https://www.linkedin.com/in/christoph-stach-7586b958"
                target="_blank"
                rel="noopener"
                aria-label="LinkedIn profile"
                class="button button--outline button--icon"
              >
                <Icon name="tabler:brand-linkedin" size="16" />
              </a>

              <a
                href="https://github.com/christophstach"
                target="_blank"
                rel="noopener"
                aria-label="GitHub profile"
                class="button button--outline button--icon"
              >
                <Icon name="tabler:brand-github" size="16" />
              </a>
            </div>
          </div>
        </div>

        <figure class="hero__figure reveal" style="animation-delay: 140ms">
          <img
            src="/images/hero.webp"
            alt="Portrait of Christoph Stach"
            width="272"
            height="272"
            fetchpriority="high"
            class="hero__portrait"
          />
          <figcaption class="hero__figcaption">portrait.webp, 1 image rendered</figcaption>
        </figure>
      </div>
    </section>

    <section class="stats reveal--scroll">
      <h2 class="section-label">stats --summary</h2>
      <ul class="stats__grid" aria-label="Career at a glance">
        <li class="stat">
          <span class="stat__value">{{ yearsEmployed }}<span class="stat__unit">+</span></span>
          <span class="stat__label">years_exp</span>
        </li>
        <li class="stat">
          <span class="stat__value">{{ companyCount }}</span>
          <span class="stat__label">companies</span>
        </li>
        <li class="stat">
          <span class="stat__value">2</span>
          <span class="stat__label">cs_degrees</span>
        </li>
        <li class="stat">
          <span class="stat__value">{{ totalSkills }}</span>
          <span class="stat__label">technologies</span>
        </li>
      </ul>
    </section>

    <section class="about reveal--scroll">
      <h2 class="section-label">about</h2>

      <div class="about__content">
        <p>
          At <strong>MBition (Mercedes-Benz)</strong>, I work as a Senior Software Engineer and own
          the <strong>Python</strong> platform on which multiple Mercedes-Benz teams build and run
          their LLM agents on <strong>Kubernetes</strong>. Its service is the cloud backend for the
          in-car voice assistant serving several million vehicles. I re-architected it to fully
          asynchronous Python, which cut its memory use by 50%, and rebuilt the CI/CD pipelines,
          which took deployment from a ~2-hour manual process to an automated 15 minutes.
        </p>

        <p>
          Before that, on the company's speech platform, I built a no-code platform for configuring
          and deploying speech applications, shipping features end-to-end in
          <strong>Vue and Nuxt</strong> with strict <strong>TypeScript</strong>. I owned code
          quality across the team and cut build times by ~50% by consolidating multiple products
          into a pnpm monorepo.
        </p>

        <p>
          Earlier, alongside my studies at DERICON, I built and owned a graph-based no-code workflow
          builder in <strong>React and Remix</strong>. At SLH, I modernized a legacy PHP application
          into a modular frontend/backend architecture.
        </p>

        <p>
          I hold a <strong>B.Sc.</strong> and an <strong>M.Sc. in Applied Computer Science</strong>
          from
          <a href="https://www.htw-berlin.de/" target="_blank" rel="noopener" class="text-link"
            >HTW Berlin</a
          >, specializing in data science and health computing, with theses on style transfer for
          low-power hardware and nanopore-based DNA sequencing.
        </p>
      </div>
    </section>

    <section class="stack reveal--scroll">
      <h2 class="section-label">stack --tree</h2>

      <p class="tree__root" aria-hidden="true">stack/</p>
      <ul class="tree">
        <li v-for="group in skills" :key="group.label" class="tree__group">
          <span class="tree__label">{{ group.label }}/</span>
          <ul class="tree__items" :aria-label="`${group.label} technologies`">
            <li v-for="item in group.items" :key="item" class="chip tree__item">
              <CvText :text="item" />
            </li>
          </ul>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.hero {
  padding-block: var(--space-10) var(--space-12);
}

.hero__grid {
  /* The source photo is only 272px wide, so it stays small to stay sharp. */
  --hero-portrait-size: 16rem;

  display: grid;
  gap: var(--space-8);
  align-items: start;
}

@media (min-width: 56rem) {
  .hero__grid {
    grid-template-columns: minmax(0, 1fr) var(--hero-portrait-size);
    gap: var(--space-10);
  }
}

/* Terminal window */
.terminal {
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.terminal__bar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border);
  background-color: var(--color-bg);
}

.terminal__dots {
  display: inline-flex;
  gap: var(--space-1-5);
}

.terminal__dots i {
  width: 0.7rem;
  height: 0.7rem;
  border-radius: var(--radius-full);
  background-color: var(--color-border-strong);
}

.terminal__dots i:first-child {
  background-color: var(--color-accent);
}

.terminal__path {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.terminal__body {
  padding: var(--space-6);
}

@media (min-width: 40rem) {
  .terminal__body {
    padding: var(--space-8);
  }
}

.terminal__cmd {
  margin-top: var(--space-5);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.terminal__cmd:first-child {
  margin-top: 0;
}

.terminal__prompt {
  color: var(--color-accent);
  font-weight: var(--font-bold);
}

.hero__title {
  margin-top: var(--space-2);
  font-size: clamp(var(--text-4xl), 6vw, var(--text-6xl));
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-tight);
}

.hero__role {
  margin-top: var(--space-2);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--color-accent);
}

.hero__sep {
  margin-inline: var(--space-2);
  color: var(--color-text-muted);
}

.hero__text {
  max-width: 40rem;
  margin-top: var(--space-3);
  font-size: var(--text-lg);
  line-height: var(--leading-relaxed);
  color: var(--color-text-soft);
}

.hero__text strong {
  color: var(--color-heading);
  font-weight: var(--font-semibold);
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3);
  margin-top: var(--space-8);
}

/* Portrait framed like an image preview pane. */
.hero__figure {
  max-width: var(--hero-portrait-size);
  margin: 0;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  overflow: hidden;
}

.hero__portrait {
  width: 100%;
  height: auto;
  aspect-ratio: 1;
  object-fit: cover;
  filter: grayscale(1);
}

.hero__figcaption {
  padding: var(--space-2) var(--space-3);
  border-top: 1px solid var(--color-border);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

/* Stat tiles */
.stats {
  padding-block: var(--space-8) 0;
}

.stats__grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-3);
  margin-top: var(--space-4);
  list-style: none;
}

@media (min-width: 48rem) {
  .stats__grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.stat {
  padding: var(--space-4);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
}

.stat__value {
  display: block;
  font-family: var(--font-mono);
  font-size: var(--text-4xl);
  font-weight: var(--font-bold);
  line-height: 1;
  color: var(--color-heading);
}

.stat__unit {
  color: var(--color-accent);
}

.stat__label {
  display: block;
  margin-top: var(--space-2);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  letter-spacing: var(--tracking-wide);
  color: var(--color-text-muted);
}

.stat__label::before {
  content: "› ";
  color: var(--color-accent);
}

/* About */
.about {
  padding-block: var(--space-10);
  margin-top: var(--space-10);
  border-top: 1px solid var(--color-rule);
}

.about__content {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  max-width: var(--content-max);
  margin-top: var(--space-5);
  line-height: var(--leading-relaxed);
  color: var(--color-text-soft);
}

.about__content strong {
  color: var(--color-heading);
  font-weight: var(--font-semibold);
}

/* Stack, drawn like `tree` output. The branches are CSS rather than box-drawing
   characters, so they stay connected when a group's tools wrap onto more lines. */
.stack {
  padding-block: var(--space-10) var(--space-12);
  border-top: 1px solid var(--color-rule);
}

.tree__root,
.tree__label {
  font-family: var(--font-mono);
  line-height: var(--tree-row);
}

.tree__root {
  --tree-row: 1.75rem;

  margin-top: var(--space-5);
  font-weight: var(--font-semibold);
  color: var(--color-heading);
}

.tree {
  --tree-row: 1.75rem;
  --tree-gap: var(--space-2);
  --tree-branch: var(--space-4);

  list-style: none;
}

.tree__group {
  position: relative;
  padding-block: var(--tree-gap);
  padding-left: calc(var(--tree-branch) + var(--space-2));
}

/* The trunk runs the full height of each group and stops at the last branch. */
.tree__group::before {
  content: "";
  position: absolute;
  inset-block: 0;
  left: 0;
  border-left: 1px solid var(--color-border-strong);
}

.tree__group:last-child::before {
  bottom: auto;
  height: calc(var(--tree-gap) + var(--tree-row) / 2);
}

.tree__group::after {
  content: "";
  position: absolute;
  top: calc(var(--tree-gap) + var(--tree-row) / 2);
  left: 0;
  width: var(--tree-branch);
  border-top: 1px solid var(--color-border-strong);
}

.tree__label {
  display: block;
  font-weight: var(--font-semibold);
  color: var(--color-heading);
}

.tree__items {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1-5);
  list-style: none;
}

.tree__item {
  padding: 0.1rem var(--space-2);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  color: var(--color-text-soft);
}

/* From tablets up, labels and tools share a line, with the tools in one aligned column. */
@media (min-width: 40rem) {
  .tree {
    display: grid;
    grid-template-columns: max-content minmax(0, 1fr);
  }

  .tree__group {
    display: grid;
    grid-column: 1 / -1;
    grid-template-columns: subgrid;
    column-gap: var(--space-5);
  }

  .tree__items {
    padding-top: calc((var(--tree-row) - 1.5rem) / 2);
  }
}
</style>
