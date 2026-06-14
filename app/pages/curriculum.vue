<script setup lang="ts">
import { education, experience, projects } from "~/data/cv";

useSeoMeta({
  title: "Curriculum",
  ogTitle: "Curriculum · Christoph Stach",
});
</script>

<template>
  <div class="container page">
    <h1 class="page__title">Curriculum</h1>

    <p class="page__intro">
      A concise overview of my professional experience and education: a decade of full-stack
      engineering with Vue/Nuxt, React/Next.js, and NestJS, more recently extending into Python for
      AI and LLM agents at MBition (Mercedes-Benz), and a B.Sc. and M.Sc. in Applied Computer
      Science focused on AI, bioinformatics, deep learning, and data science.
    </p>

    <div class="page__columns">
      <section>
        <h2 class="section-label page__section-label">Professional experience</h2>

        <CvTimeline :entries="experience">
          <template #icon>
            <Icon name="tabler:briefcase" size="16" />
          </template>
        </CvTimeline>
      </section>

      <section>
        <h2 class="section-label page__section-label">Education</h2>

        <CvTimeline :entries="education">
          <template #icon>
            <Icon name="tabler:school" size="16" />
          </template>
        </CvTimeline>
      </section>
    </div>

    <section class="projects">
      <h2 class="section-label page__section-label">Recent projects</h2>

      <ul class="projects__grid">
        <li v-for="project in projects" :key="project.title" class="projects__card">
          <h3 class="projects__title">{{ project.title }}</h3>

          <p class="projects__description">{{ project.description }}</p>

          <ul class="projects__tech" aria-label="Technologies">
            <li v-for="tech in project.tech" :key="tech" class="chip chip--accent">
              {{ tech }}
            </li>
          </ul>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.page {
  padding-block: var(--space-16);
}

.page__title {
  font-size: clamp(var(--text-3xl), 4vw, var(--text-4xl));
  font-weight: var(--font-extrabold);
  letter-spacing: var(--tracking-tight);
}

.page__intro {
  max-width: var(--content-max);
  margin-top: var(--space-6);
  line-height: var(--leading-relaxed);
  color: var(--color-text-soft);
}

.page__columns {
  display: grid;
  gap: var(--space-14);
  margin-top: var(--space-14);
}

@media (min-width: 64rem) {
  .page__columns {
    grid-template-columns: 1fr 1fr;
    gap: var(--space-10);
  }
}

.page__section-label {
  display: block;
  margin-bottom: var(--space-8);
}

.projects {
  margin-top: var(--space-16);
  padding-top: var(--space-16);
  border-top: 1px solid var(--color-border);
}

.projects__grid {
  display: grid;
  gap: var(--space-5);
  list-style: none;
}

@media (min-width: 48rem) {
  .projects__grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.projects__card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-5);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background-color: var(--color-bg);
  transition: border-color var(--transition-fast);
}

.projects__card:hover {
  border-color: var(--color-border-strong);
}

.projects__title {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  line-height: var(--leading-snug);
}

.projects__description {
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
  color: var(--color-text-soft);
}

.projects__tech {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1-5);
  margin-top: auto;
  padding-top: var(--space-1);
  list-style: none;
}
</style>
