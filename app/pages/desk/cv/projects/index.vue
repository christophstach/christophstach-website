<script setup lang="ts">
import { computed, ref } from "vue";
import { navigateTo, refreshNuxtData, useFetch, useRoute, useSeoMeta } from "nuxt/app";
import { useDeskRequest } from "~/utils/desk-request";

definePageMeta({ layout: "desk" });

useSeoMeta({
  title: "Projects · Desk",
  robots: "noindex, nofollow",
});

const route = useRoute();
const { data: projects } = await useFetch("/api/desk/projects", { key: "desk-projects" });
const { data: variants } = await useFetch("/api/desk/cv-variants", { key: "desk-cv-variants" });

/** Labels of the variants that show a project. */
function usedBy(id: string): string[] {
  return (variants.value?.variants ?? [])
    .filter((variant) => variant.projects.includes(id))
    .map((variant) => variant.label);
}

// "?new" opens the form.
const creating = computed(() => route.query.new !== undefined);
const form = ref({ id: "", name: "", title: "" });
const request = useDeskRequest();

async function create() {
  const id = form.value.id.trim();
  const body = {
    name: form.value.name,
    note: "",
    title: form.value.title,
    description: "",
    tech: [],
    url: "",
  };

  if (await request.run(() => $fetch(`/api/desk/projects/${id}`, { method: "POST", body }))) {
    await refreshNuxtData("desk-projects");
    form.value = { id: "", name: "", title: "" };
    await navigateTo(`/desk/cv/projects/${id}`);
  }
}
</script>

<template>
  <div class="overview">
    <header class="overview__header">
      <div class="overview__heading">
        <p class="overview__path">
          <NuxtLink to="/desk/cv" class="overview__crumb">~/desk/cv</NuxtLink> / projects
        </p>
        <h1 class="overview__title">Projects</h1>
        <p class="overview__intro">
          Projects for /curriculum. The website variant picks which ones show, and in what order.
        </p>
      </div>

      <NuxtLink v-if="!creating" to="/desk/cv/projects?new" class="button button--primary">
        <Icon name="tabler:plus" size="16" />
        New project
      </NuxtLink>
    </header>

    <form v-if="creating" class="create" @submit.prevent="create">
      <h2 class="create__title">New project</h2>

      <div class="create__fields">
        <label class="field">
          <span class="field__label">id</span>
          <input
            v-model="form.id"
            class="input"
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            placeholder="my-project"
          />
          <span class="field__hint">The URL slug: lowercase letters, digits and hyphens.</span>
        </label>

        <label class="field">
          <span class="field__label">name</span>
          <input v-model="form.name" class="input" required placeholder="My project" />
          <span class="field__hint">Only the desk shows it.</span>
        </label>

        <label class="field">
          <span class="field__label">title</span>
          <input v-model="form.title" class="input" required placeholder="My Project" />
          <span class="field__hint">The heading /curriculum shows.</span>
        </label>
      </div>

      <p v-if="request.error.value" class="create__error" role="alert">
        {{ request.error.value }}
      </p>

      <div class="create__actions">
        <button type="submit" class="button button--primary" :disabled="request.busy.value">
          {{ request.busy.value ? "Creating…" : "Create project" }}
        </button>
        <NuxtLink to="/desk/cv/projects" class="button button--outline">Cancel</NuxtLink>
      </div>
    </form>

    <ul v-if="projects?.length" class="cards">
      <li v-for="project in projects" :key="project.id">
        <NuxtLink :to="`/desk/cv/projects/${project.id}`" class="card">
          <span class="card__label">{{ project.name || project.title }}</span>
          <span v-if="project.note" class="desk-note">{{ project.note }}</span>
          <span class="card__description">{{ project.description || "No description yet." }}</span>
          <span v-if="project.tech.length" class="card__tech">
            <span v-for="tech in project.tech" :key="tech" class="chip">{{ tech }}</span>
          </span>
          <span class="card__meta">
            {{
              usedBy(project.id).length ? `shown by ${usedBy(project.id).join(", ")}` : "not shown"
            }}
          </span>
        </NuxtLink>
      </li>
    </ul>

    <p v-else class="overview__empty">No projects yet.</p>
  </div>
</template>

<style scoped>
.overview {
  display: grid;
  gap: var(--space-10);
  max-width: 64rem;
  padding: var(--space-10) var(--space-6);
}

@media (min-width: 48rem) {
  .overview {
    padding: var(--space-12) var(--space-12);
  }
}

.overview__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-6);
}

.overview__heading {
  display: grid;
  gap: var(--space-2);
}

.overview__path,
.overview__empty {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.overview__crumb {
  color: inherit;
}

.overview__crumb:hover {
  color: var(--color-accent);
}

.overview__title {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-tight);
}

.overview__intro {
  color: var(--color-text-soft);
}

.create {
  display: grid;
  gap: var(--space-5);
  padding: var(--space-6);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
}

.create__title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
}

.create__fields {
  display: grid;
  gap: var(--space-4);
}

@media (min-width: 48rem) {
  .create__fields {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }
}

.create__error {
  font-size: var(--text-sm);
  color: var(--color-signal);
}

.create__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.cards {
  display: grid;
  gap: var(--space-4);
  padding: 0;
  margin: 0;
  list-style: none;
}

@media (min-width: 64rem) {
  .cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  block-size: 100%;
  padding: var(--space-5) var(--space-6);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-lg);
  background-color: var(--color-surface);
  color: var(--color-text);
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.card:hover {
  border-color: var(--color-accent);
  box-shadow: var(--shadow-md);
}

.card__label {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-heading);
}

.card__description {
  display: -webkit-box;
  overflow: hidden;
  color: var(--color-text-soft);
  font-size: var(--text-sm);
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.card__tech {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1-5);
}

.card__meta {
  margin-top: auto;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}
</style>
