<script setup lang="ts">
import { useUserSession } from "#imports";

const { title, cwd, output, hint } = defineProps<{
  title: string;
  /** Working directory shown in the prompt, e.g. `~/desk/cv`. */
  cwd: string;
  /** Lines printed by the `ls` in the transcript. */
  output: string[];
  hint: string;
}>();

const { user } = useUserSession();
</script>

<template>
  <div class="empty">
    <h1 class="empty__title">{{ title }}</h1>

    <pre
      class="empty__shell"
    ><span class="empty__prompt">{{ user?.login ?? "christoph" }}@desk:{{ cwd }}$</span> ls
{{ output.join("\n") }}
<span class="empty__prompt">{{ user?.login ?? "christoph" }}@desk:{{ cwd }}$</span> <span class="empty__cursor" aria-hidden="true"></span></pre>

    <p class="empty__hint">{{ hint }}</p>
  </div>
</template>

<style scoped>
.empty {
  max-width: var(--content-max);
  padding: var(--space-12) var(--space-6);
}

@media (min-width: 48rem) {
  .empty {
    padding: var(--space-16) var(--space-12);
  }
}

.empty__title {
  font-size: var(--text-3xl);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-tight);
}

.empty__shell {
  margin-top: var(--space-8);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
  color: var(--color-text);
  white-space: pre-wrap;
}

.empty__prompt {
  color: var(--color-accent);
}

.empty__cursor {
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
  .empty__cursor {
    animation: none;
  }
}

.empty__hint {
  margin-top: var(--space-6);
  color: var(--color-text-soft);
}
</style>
