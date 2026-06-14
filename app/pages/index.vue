<script setup lang="ts">
import heroImage from "~/assets/images/hero.webp";

const skillGroups = [
  { label: "frontend", items: ["Vue / Nuxt", "React / Next.js", "TypeScript", "Tailwind"] },
  { label: "backend", items: ["NestJS", "Python", "PostgreSQL", "MongoDB"] },
  { label: "ai_agents", items: ["LLMs & AI Agents", "A2A / MCP"] },
  { label: "infra_devops", items: ["Kubernetes", "GitLab CI", "Azure DevOps"] },
];

const totalSkills = skillGroups.reduce((sum, group) => sum + group.items.length, 0);
const maxGroup = Math.max(...skillGroups.map((group) => group.items.length));

function useCountUp(target: number, duration = 1100) {
  const value = ref(target);

  onMounted(() => {
    if (globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const start = performance.now();
    value.value = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      value.value = Math.round(target * eased);

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
  });

  return value;
}

const years = useCountUp(10);
const companies = useCountUp(4);
const degrees = useCountUp(2);
const techs = useCountUp(totalSkills);
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
            <h1 class="hero__title">Christoph Stach<span class="cursor" aria-hidden="true" /></h1>
            <p class="hero__role">
              Senior Full-Stack Engineer<span class="hero__sep">//</span>Berlin<span
                class="hero__sep"
                >//</span
              >10+ yrs
            </p>

            <p class="terminal__cmd"><span class="terminal__prompt">$</span> cat about.txt</p>
            <p class="hero__text">
              Building modern web apps across <strong>Vue/Nuxt</strong> and
              <strong>React/Next.js</strong> for a decade — and more recently
              <strong>Python backends for AI and LLM agents</strong>. I care about clean, type-safe
              code, usability, accessibility, and performance, with an eye for detail in component
              design.
            </p>

            <div class="hero__actions">
              <NuxtLink to="/curriculum" class="button button--primary">
                ./curriculum
                <Icon name="tabler:arrow-right" size="16" />
              </NuxtLink>

              <a
                href="https://www.linkedin.com/in/christoph-stach-7586b958"
                target="_blank"
                rel="noopener"
                class="button button--outline"
              >
                <Icon name="tabler:brand-linkedin" size="16" />
                linkedin
              </a>

              <a
                href="https://github.com/christophstach"
                target="_blank"
                rel="noopener"
                class="button button--outline"
              >
                <Icon name="tabler:brand-github" size="16" />
                github
              </a>
            </div>
          </div>
        </div>

        <figure class="hero__figure reveal" style="animation-delay: 140ms">
          <img
            :src="heroImage"
            alt="Portrait of Christoph Stach"
            width="288"
            height="288"
            class="hero__portrait"
          />
          <figcaption class="hero__figcaption">portrait.webp — 1 image rendered</figcaption>
        </figure>
      </div>
    </section>

    <section class="stats reveal" style="animation-delay: 120ms">
      <h2 class="section-label">stats --summary</h2>
      <ul class="stats__grid" aria-label="Career at a glance">
        <li class="stat">
          <span class="stat__value">{{ years }}<span class="stat__unit">+</span></span>
          <span class="stat__label">years_exp</span>
        </li>
        <li class="stat">
          <span class="stat__value">{{ companies }}</span>
          <span class="stat__label">companies</span>
        </li>
        <li class="stat">
          <span class="stat__value">{{ degrees }}</span>
          <span class="stat__label">cs_degrees</span>
        </li>
        <li class="stat">
          <span class="stat__value">{{ techs }}</span>
          <span class="stat__label">technologies</span>
        </li>
      </ul>
    </section>

    <section class="about reveal" style="animation-delay: 120ms">
      <h2 class="section-label">about</h2>

      <div class="about__content">
        <p>
          At <strong>MBition (Mercedes-Benz)</strong>, I work as a Senior Full Stack Engineer. My
          home base is the web: I ship features end-to-end across
          <strong>Nuxt and NestJS</strong> with strict <strong>TypeScript</strong> and zod-validated
          REST contracts, maintain pnpm monorepos for better DX, and build reliable CI/CD pipelines
          in <strong>GitLab CI and Azure DevOps</strong>. More recently I've moved into
          <strong>Python</strong>, building and operating a platform that hosts LLM agents on
          Kubernetes — the shared service, base classes, and CI/CD that agent teams plug their
          business logic into.
        </p>

        <p>
          Before that, I spent several years at DERICON building frontends with
          <strong>React, Remix, Vue, Nuxt, and Angular</strong>, including a graph-based no-code
          workflow builder that empowered non-technical users to model and deploy workflows
          themselves. Earlier in my career I worked as a PHP/JavaScript full-stack developer,
          modernising legacy systems and improving maintainability and feature velocity.
        </p>

        <p>
          Alongside my professional work, I completed both a <strong>B.Sc.</strong> and
          <strong>M.Sc. in Applied Computer Science</strong> at
          <a href="https://www.htw-berlin.de/" target="_blank" rel="noopener" class="text-link"
            >HTW Berlin</a
          >, specialising in AI, bioinformatics, deep learning, and data science, with research on
          nanopore-based DNA sequencing and neural style transfer.
        </p>
      </div>
    </section>

    <section class="stack reveal">
      <h2 class="section-label">stack --distribution</h2>

      <ul class="meters">
        <li v-for="group in skillGroups" :key="group.label" class="meter">
          <div class="meter__head">
            <span class="meter__label">{{ group.label }}</span>
            <span class="meter__count">[{{ group.items.length }}]</span>
          </div>
          <div class="meter__track">
            <div
              class="meter__fill"
              :style="{ '--meter-value': `${(group.items.length / maxGroup) * 100}%` }"
            />
          </div>
          <ul class="meter__tags" :aria-label="`${group.label} technologies`">
            <li v-for="item in group.items" :key="item" class="chip chip--accent">{{ item }}</li>
          </ul>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.hero {
  padding-block: var(--space-12) var(--space-16);
}

.hero__grid {
  display: grid;
  gap: var(--space-8);
  align-items: start;
}

@media (min-width: 56rem) {
  .hero__grid {
    grid-template-columns: 1.7fr 1fr;
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
  filter: grayscale(1) sepia(0.4) hue-rotate(90deg) saturate(1.3) contrast(1.05);
  transition: filter var(--transition-fast);
}

.hero__figure:hover .hero__portrait {
  filter: none;
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
  padding-block: var(--space-12) var(--space-4);
}

.stats__grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-4);
  margin-top: var(--space-6);
  list-style: none;
}

@media (min-width: 48rem) {
  .stats__grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.stat {
  padding: var(--space-5);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  background-color: var(--color-surface);
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.stat:hover {
  border-color: var(--color-accent);
  box-shadow: var(--glow-accent);
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
  padding-block: var(--space-12);
  margin-top: var(--space-12);
  border-top: 1px solid var(--color-border);
}

.about__content {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  max-width: var(--content-max);
  margin-top: var(--space-6);
  line-height: var(--leading-relaxed);
  color: var(--color-text-soft);
}

.about__content strong {
  color: var(--color-heading);
  font-weight: var(--font-semibold);
}

/* Stack distribution meters */
.stack {
  padding-block: var(--space-12) var(--space-16);
  border-top: 1px solid var(--color-border);
}

.meters {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  margin-top: var(--space-8);
  list-style: none;
}

.meter__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  font-family: var(--font-mono);
}

.meter__label {
  font-weight: var(--font-semibold);
  color: var(--color-heading);
}

.meter__count {
  font-size: var(--text-sm);
  color: var(--color-accent);
}

.meter__track {
  height: 0.5rem;
  margin-top: var(--space-2);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
  background-color: var(--color-bg);
  overflow: hidden;
}

.meter__fill {
  width: var(--meter-value);
  height: 100%;
  background-color: var(--color-accent);
  box-shadow: var(--glow-accent);
  animation: meter-grow 1s ease both;
}

@keyframes meter-grow {
  from {
    width: 0;
  }

  to {
    width: var(--meter-value);
  }
}

.meter__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1-5);
  margin-top: var(--space-3);
  list-style: none;
}
</style>
