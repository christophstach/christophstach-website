<script setup lang="ts">
import type { Profile } from "~/data/cv";
import { stripScheme } from "~/utils/format";

const { profile, role = "" } = defineProps<{
  profile: Profile;
  /** Printed under the name; a cover letter passes it, the CV doesn't. */
  role?: string;
}>();
</script>

<!-- The head of the printed CV and of a cover letter, so the two read as one
     set. The slot is what a document adds between the role and the contact lines. -->
<template>
  <header class="cv__header">
    <h1 class="cv__name">{{ profile.name }}</h1>
    <p v-if="role" class="cv__role"><CvText :text="role" /></p>
    <slot />
    <ul class="cv__contact">
      <li><CvText :text="profile.location" /></li>
      <li>
        <a :href="`mailto:${profile.email}`">{{ profile.email }}</a>
      </li>
      <li>
        <a :href="`tel:${profile.phone.replaceAll(' ', '')}`">{{ profile.phone }}</a>
      </li>
    </ul>
    <ul class="cv__contact cv__contact--links">
      <li v-for="link in profile.links" :key="link.href">
        <a :href="link.href">{{ stripScheme(link.href) }}</a>
      </li>
    </ul>
  </header>
</template>

<style scoped>
.cv__header {
  padding-bottom: calc(16px * var(--cv-space));
  margin-bottom: calc(28px * var(--cv-space));
  border-bottom: 2px solid var(--cv-accent);
  break-inside: avoid;
}

.cv__name {
  font-family: inherit;
  font-size: calc(30px * var(--cv-scale));
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.01em;
  color: inherit;
}

.cv__role {
  margin-top: calc(4px * var(--cv-space));
  font-size: calc(15px * var(--cv-scale));
  font-weight: 500;
  color: var(--cv-accent);
}

.cv__contact {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 0;
  padding: 0;
  margin-top: calc(10px * var(--cv-space));
  list-style: none;
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: calc(10.5px * var(--cv-scale));
  color: var(--cv-soft);
}

.cv__contact--links {
  margin-top: 2px;
}

/* After the item, not before the next: a wrapped line never starts with one. */
.cv__contact li:not(:last-child)::after {
  content: "·";
  margin-inline: 8px;
  color: var(--cv-muted);
}
</style>
