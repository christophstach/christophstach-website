<script setup lang="ts">
import type { NuxtError } from "#app";

const { error } = defineProps<{
  error: NuxtError;
}>();

const route = useRoute();

const isNotFound = computed(() => error.statusCode === 404);

// Mirrors what a shell says when you cd into a path that isn't there.
const shellMessage = computed(() =>
  isNotFound.value
    ? `cd: ${route.path}: No such file or directory`
    : error.message || "Something went wrong on this end.",
);

useSeoMeta({
  title: isNotFound.value ? "Page not found" : "Error",
  robots: "noindex",
});

function goHome() {
  clearError({ redirect: "/" });
}
</script>

<template>
  <div class="layout">
    <AppHeader />

    <main class="layout__main">
      <div class="container error">
        <h1 class="section-label">error</h1>

        <p class="error__code">{{ error.statusCode }}</p>

        <p class="error__shell">
          <span class="error__prompt">$</span> cd <span class="error__path">{{ route.path }}</span>
        </p>

        <p class="error__message">{{ shellMessage }}</p>

        <div class="error__actions">
          <button type="button" class="button button--primary" @click="goHome">
            cd ~
            <Icon name="tabler:arrow-right" size="16" />
          </button>

          <NuxtLink to="/curriculum" class="button button--outline">curriculum</NuxtLink>
        </div>
      </div>
    </main>

    <AppFooter />
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
}

.layout__main {
  display: flex;
  flex: 1;
  align-items: center;
}

.error {
  padding-block: var(--space-16);
}

.error__code {
  margin-top: var(--space-4);
  font-family: var(--font-mono);
  font-size: clamp(var(--text-4xl), 14vw, var(--text-6xl));
  font-weight: var(--font-bold);
  line-height: 1;
  letter-spacing: var(--tracking-tight);
  color: var(--color-heading);
}

.error__shell {
  margin-top: var(--space-6);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}

.error__prompt {
  color: var(--color-accent);
  font-weight: var(--font-bold);
}

.error__path {
  color: var(--color-text-soft);
}

.error__message {
  max-width: var(--content-max);
  margin-top: var(--space-2);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--color-text-soft);
}

.error__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-top: var(--space-8);
}
</style>
