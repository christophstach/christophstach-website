<script setup lang="ts">
import { education, experience, profile, projects, skills } from "~/data/cv";
import DeskCvSection from "~/components/DeskCvSection.vue";
import { bulletsFor } from "~/utils/cv";
import { useSeoMeta } from "nuxt/app";

definePageMeta({ layout: "desk" });

useSeoMeta({
  title: "CV · Desk",
  robots: "noindex, nofollow",
});

const sections = [
  { id: "profile", label: "profile" },
  { id: "experience", label: "experience" },
  { id: "education", label: "education" },
  { id: "projects", label: "projects" },
  { id: "skills", label: "skills" },
];

const timelines = [
  { id: "experience", entries: experience },
  { id: "education", entries: education },
];

type Entry = (typeof experience)[number];

function period(entry: Entry): string {
  return `${entry.from} – ${entry.to ?? "now"}`;
}

/** Bullet counts per output; they differ when a bullet is web- or print-only. */
function bulletCounts(entry: Entry): string {
  const web = bulletsFor("web", entry.bullets).length;
  const print = bulletsFor("print", entry.bullets).length;

  const noun = web === 1 ? "bullet" : "bullets";

  return web === print ? `${web} ${noun}` : `${web} ${noun} on web, ${print} in PDF`;
}
</script>

<template>
  <div class="cv">
    <header class="cv__header">
      <h1 class="cv__title">CV</h1>

      <p class="cv__outputs">
        <a href="/curriculum" class="text-link" target="_blank">Public page</a>
        <a href="/christoph-stach-cv.pdf" class="text-link" target="_blank">PDF</a>
      </p>
    </header>

    <nav class="cv__jump" aria-label="CV sections">
      <a
        v-for="section in sections"
        :key="section.id"
        :href="`#${section.id}`"
        class="cv__jump-link"
      >
        {{ section.label }}
      </a>
    </nav>

    <div class="cv__sections">
      <DeskCvSection id="profile" label="profile">
        <dl class="profile">
          <dt>name</dt>
          <dd>{{ profile.name }}</dd>
          <dt>role</dt>
          <dd>{{ profile.role }}</dd>
          <dt>location</dt>
          <dd>{{ profile.location }}</dd>
          <dt>email</dt>
          <dd>{{ profile.email }}</dd>
          <dt>phone</dt>
          <dd>{{ profile.phone }}</dd>
          <dt>summary</dt>
          <dd class="profile__prose">{{ profile.summary }}</dd>
          <dt>core tech</dt>
          <dd>
            <ul class="tags">
              <li v-for="item in profile.coreTechnologies" :key="item" class="tag">{{ item }}</li>
            </ul>
          </dd>
          <dt>links</dt>
          <dd>
            <ul class="profile__links">
              <li v-for="link in profile.links" :key="link.href">
                <a :href="link.href" class="text-link" target="_blank" rel="noopener">{{
                  link.label
                }}</a>
              </li>
            </ul>
          </dd>
        </dl>
      </DeskCvSection>

      <DeskCvSection
        v-for="timeline in timelines"
        :id="timeline.id"
        :key="timeline.id"
        :label="timeline.id"
        :count="timeline.entries.length"
      >
        <ol class="rows">
          <li
            v-for="entry in timeline.entries"
            :key="`${entry.organization}-${entry.from}`"
            class="row"
          >
            <span class="row__period">{{ period(entry) }}</span>
            <div class="row__main">
              <p class="row__title">{{ entry.title }}</p>
              <p class="row__sub">
                {{ entry.organization
                }}<template v-if="entry.location">, {{ entry.location }}</template>
              </p>
              <p class="row__meta">
                <span v-if="entry.bullets?.length">{{ bulletCounts(entry) }}</span>
                <span v-if="entry.tech?.length">{{ entry.tech.length }} tech</span>
                <span v-if="entry.links?.length"
                  >{{ entry.links.length }} {{ entry.links.length === 1 ? "link" : "links" }}</span
                >
              </p>
            </div>
          </li>
        </ol>
      </DeskCvSection>

      <DeskCvSection id="projects" label="projects" :count="projects.length">
        <ol class="rows">
          <li v-for="project in projects" :key="project.title" class="row row--single">
            <div class="row__main">
              <p class="row__title">{{ project.title }}</p>
              <p class="row__sub">{{ project.description }}</p>
              <ul class="tags">
                <li v-for="item in project.tech" :key="item" class="tag">{{ item }}</li>
              </ul>
            </div>
          </li>
        </ol>
      </DeskCvSection>

      <DeskCvSection id="skills" label="skills" :count="skills.length">
        <ol class="rows">
          <li v-for="group in skills" :key="group.label" class="row">
            <span class="row__period">{{ group.label }}</span>
            <div class="row__main">
              <p class="row__title">{{ group.title }}</p>
              <ul class="tags">
                <li v-for="item in group.items" :key="item" class="tag">{{ item }}</li>
              </ul>
            </div>
          </li>
        </ol>
      </DeskCvSection>
    </div>
  </div>
</template>

<style scoped>
.cv {
  max-width: 56rem;
  padding: var(--space-12) var(--space-6);
}

@media (min-width: 48rem) {
  .cv {
    padding: var(--space-16) var(--space-12);
  }
}

.cv__header {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-4);
}

.cv__title {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-tight);
}

.cv__outputs {
  display: flex;
  gap: var(--space-4);
  font-size: var(--text-sm);
}

.cv__jump {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  margin-top: var(--space-6);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
}

.cv__jump-link {
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-soft);
  transition:
    border-color var(--transition-fast),
    color var(--transition-fast);
}

.cv__jump-link:hover {
  border-color: var(--color-accent);
  color: var(--color-heading);
}

.cv__sections {
  display: grid;
  gap: var(--space-12);
  margin-top: var(--space-12);
}

/* Profile: a key/value listing, keys aligned like a config file. */
.profile {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-1) var(--space-6);
  margin: 0;
}

.profile dt {
  margin-top: var(--space-3);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.profile dd {
  margin: 0;
  color: var(--color-text);
}

@media (min-width: 40rem) {
  .profile {
    grid-template-columns: 9rem 1fr;
    row-gap: var(--space-3);
  }

  .profile dt {
    margin-top: 0;
  }
}

.profile__prose {
  max-width: var(--content-max);
  line-height: var(--leading-relaxed);
}

.profile__links {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  padding: 0;
  margin: 0;
  list-style: none;
}

/* Entry rows: a fixed key column (period or identifier) and the entry. */
.rows {
  padding: 0;
  margin: 0;
  list-style: none;
}

.row {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-1) var(--space-6);
  padding-block: var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.row:last-child {
  border-bottom: 0;
}

@media (min-width: 40rem) {
  .row {
    grid-template-columns: 9rem 1fr;
  }

  .row--single {
    grid-template-columns: 1fr;
  }
}

.row__period {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  white-space: nowrap;
}

.row__title {
  font-weight: var(--font-semibold);
  color: var(--color-heading);
}

.row__sub {
  max-width: var(--content-max);
  margin-top: var(--space-1);
  color: var(--color-text-soft);
}

.row__meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  margin-top: var(--space-2);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1-5);
  padding: 0;
  margin: var(--space-2) 0 0;
  list-style: none;
}

.profile .tags {
  margin-top: 0;
}

.tag {
  padding: 0.1rem var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-soft);
}
</style>
