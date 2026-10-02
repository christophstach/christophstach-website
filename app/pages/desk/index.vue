<script setup lang="ts">
import { useSeoMeta } from "nuxt/app";
import { useUserSession } from "#imports";

definePageMeta({ layout: "desk" });

useSeoMeta({
  title: "Desk",
  robots: "noindex, nofollow",
});

const { user } = useUserSession();
</script>

<template>
  <div class="overview">
    <h1 class="overview__title">Overview</h1>

    <pre
      class="overview__shell"
    ><span class="overview__prompt">{{ user?.login ?? "christoph" }}@desk:~/desk$</span> ls
total 0
<span class="overview__prompt">{{ user?.login ?? "christoph" }}@desk:~/desk$</span> <span class="overview__cursor" aria-hidden="true"></span></pre>

    <p class="overview__hint">
      Nothing here yet. Sections you add to the desk show up in the sidebar.
    </p>
  </div>
</template>

<style scoped>
.overview {
  max-width: var(--content-max);
  padding: var(--space-12) var(--space-6);
}

@media (min-width: 48rem) {
  .overview {
    padding: var(--space-16) var(--space-12);
  }
}

.overview__title {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-tight);
}

.overview__shell {
  margin-top: var(--space-8);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
  color: var(--color-text);
  white-space: pre-wrap;
}

.overview__prompt {
  color: var(--color-accent);
}

.overview__cursor {
  display: inline-block;
  width: 0.6em;
  height: 1.15em;
  vertical-align: text-bottom;
  background-color: var(--color-accent);
  animation: blink 1.1s steps(1) infinite;
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .overview__cursor {
    animation: none;
  }
}

.overview__hint {
  margin-top: var(--space-6);
  color: var(--color-text-soft);
}
</style>
