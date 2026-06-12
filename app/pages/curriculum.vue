<script setup lang="ts">
import { Briefcase, GraduationCap } from "lucide-vue-next";

import { education, experience } from "~/data/cv";

useSeoMeta({
  title: "Curriculum",
  ogTitle: "Curriculum · Christoph Stach",
});
</script>

<template>
  <div class="container page">
    <h1 class="page__title">Curriculum</h1>

    <p class="page__intro">
      A concise overview of my professional experience and education: recent work on Nuxt/NestJS
      products at MBition (Mercedes-Benz), several years of frontend engineering with React, Remix,
      Vue, Nuxt, and Angular, and a B.Sc. and M.Sc. in Applied Computer Science focused on AI,
      bioinformatics, deep learning, and data science.
    </p>

    <div class="page__columns">
      <section>
        <h2 class="section-label page__section-label">Professional experience</h2>

        <CvTimeline :entries="experience">
          <template #icon>
            <Briefcase :size="16" />
          </template>
        </CvTimeline>
      </section>

      <section>
        <h2 class="section-label page__section-label">Education</h2>

        <CvTimeline :entries="education">
          <template #icon>
            <GraduationCap :size="16" />
          </template>
        </CvTimeline>
      </section>
    </div>
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
</style>
