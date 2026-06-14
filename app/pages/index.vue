<script setup lang="ts">
import heroImage from "~/assets/images/hero.webp";

const skills = [
  "Vue / Nuxt",
  "React / Next.js",
  "TypeScript",
  "Tailwind",
  "NestJS",
  "Python",
  "LLMs & AI Agents",
  "A2A / MCP",
  "Kubernetes",
  "PostgreSQL",
  "MongoDB",
  "GitLab CI",
  "Azure DevOps",
];
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

      <h2 class="section-label about__skills-label">stack --list</h2>
      <ul class="about__skills" aria-label="Skills">
        <li v-for="skill in skills" :key="skill" class="chip chip--outline">
          {{ skill }}
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

.about {
  padding-block: var(--space-16);
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

.about__skills-label {
  display: block;
  margin-top: var(--space-12);
}

.about__skills {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-5);
  list-style: none;
}
</style>
