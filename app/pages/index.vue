<script setup lang="ts">
import heroImage from "~/assets/images/hero.webp";

const skills = [
  "Vue / Nuxt",
  "React / Next.js",
  "Angular",
  "TypeScript",
  "NestJS",
  "PostgreSQL",
  "MongoDB",
  "Azure DevOps",
  "CI/CD",
];
</script>

<template>
  <div class="container">
    <section class="hero">
      <div class="hero__content">
        <h1 class="hero__title">Hi, I'm Christoph.</h1>

        <p class="hero__text">
          I'm a full-stack engineer based in Berlin with 10+ years of experience building modern web
          apps across <strong>Vue/Nuxt</strong>, <strong>React/Next.js</strong>, and
          <strong>Angular</strong>. I care about clean, type-safe code, usability, accessibility,
          and performance, with a strong focus on well-designed, reusable components.
        </p>

        <div class="hero__actions">
          <NuxtLink to="/curriculum" class="button button--primary">
            View curriculum
            <Icon name="tabler:arrow-right" size="16" />
          </NuxtLink>

          <a
            href="https://www.linkedin.com/in/christoph-stach-7586b958"
            target="_blank"
            rel="noopener"
            class="button button--outline"
          >
            <Icon name="tabler:brand-linkedin" size="16" />
            LinkedIn
          </a>

          <a
            href="https://github.com/christophstach"
            target="_blank"
            rel="noopener"
            class="button button--outline"
          >
            <Icon name="tabler:brand-github" size="16" />
            GitHub
          </a>
        </div>
      </div>

      <img
        :src="heroImage"
        alt="Portrait of Christoph Stach"
        width="288"
        height="288"
        class="hero__portrait"
      />
    </section>

    <section class="about">
      <h2 class="section-label">About me</h2>

      <div class="about__content">
        <p>
          At <strong>MBition (Mercedes-Benz)</strong>, I work as a Senior Full Stack Engineer on
          Nuxt and NestJS applications backed by PostgreSQL and MongoDB. I ship features end-to-end,
          from designing REST contracts and APIs to building reusable UI components. I enjoy
          enforcing strong <strong>TypeScript</strong> and linting standards, maintaining pnpm
          monorepos for better DX, and setting up reliable
          <strong>CI/CD pipelines in Azure DevOps</strong>.
        </p>

        <p>
          Before that, I spent several years building frontends with
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
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  gap: var(--space-10);
  padding-block: var(--space-16);
  text-align: center;
}

@media (min-width: 64rem) {
  .hero {
    flex-direction: row;
    gap: var(--space-16);
    padding-block: var(--space-24);
    text-align: left;
  }
}

.hero__title {
  font-size: clamp(var(--text-4xl), 5vw, var(--text-5xl));
  font-weight: var(--font-extrabold);
  letter-spacing: var(--tracking-tight);
}

.hero__text {
  margin-top: var(--space-6);
  font-size: var(--text-lg);
  line-height: var(--leading-relaxed);
  color: var(--color-text-soft);
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  margin-top: var(--space-8);
}

@media (min-width: 64rem) {
  .hero__actions {
    justify-content: flex-start;
  }
}

.hero__portrait {
  flex-shrink: 0;
  width: 11rem;
  height: 11rem;
  border-radius: var(--radius-full);
  object-fit: cover;
  box-shadow:
    0 0 0 4px var(--color-ring),
    var(--shadow-xl);
}

@media (min-width: 40rem) {
  .hero__portrait {
    width: 16rem;
    height: 16rem;
  }
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

.about__skills {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  max-width: var(--content-max);
  margin-top: var(--space-8);
  list-style: none;
}
</style>
