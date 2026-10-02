<script setup lang="ts">
import { deskSections } from "~/data/desk";
import { navigateTo } from "nuxt/app";
import { useUserSession } from "#imports";

const { user, clear } = useUserSession();

async function signOut() {
  await clear();
  await navigateTo("/");
}
</script>

<template>
  <div class="desk">
    <a class="skip-link" href="#main">Skip to content</a>

    <aside class="desk__sidebar">
      <!-- A shell path: `~` leads back to the public site, `/desk` to the desk. -->
      <p class="desk__path">
        <NuxtLink to="/" class="desk__path-home" title="Back to the site">~</NuxtLink
        ><NuxtLink to="/desk" class="desk__path-desk">/desk</NuxtLink>
      </p>

      <nav class="desk__nav" aria-label="Desk sections">
        <ul>
          <li v-for="section in deskSections" :key="section.to">
            <NuxtLink :to="section.to" class="desk__link" exact-active-class="desk__link--active">
              {{ section.label }}
            </NuxtLink>
          </li>
        </ul>
      </nav>

      <div class="desk__session">
        <p v-if="user" class="desk__user">
          <img :src="user.avatarUrl" alt="" width="24" height="24" class="desk__avatar" />
          <span class="desk__login">{{ user.login }}</span>
        </p>

        <div class="desk__tools">
          <ThemeToggle />
          <button
            type="button"
            class="icon-button"
            aria-label="Sign out"
            title="Sign out"
            @click="signOut"
          >
            <Icon name="tabler:logout" size="20" />
          </button>
        </div>
      </div>
    </aside>

    <main id="main" class="desk__main" tabindex="-1">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.desk {
  display: grid;
  grid-template-rows: auto 1fr;
  min-height: 100dvh;
}

/* Below 48rem the sidebar is a top bar: path, sections, then session tools. */
.desk__sidebar {
  position: sticky;
  top: 0;
  z-index: var(--z-header);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2) var(--space-4);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-rule);
  background-color: var(--color-surface);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
}

.desk__path {
  font-size: var(--text-base);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-tight);
}

.desk__path-home {
  color: var(--color-text-muted);
  font-weight: var(--font-regular);
  transition: color var(--transition-fast);
}

.desk__path-home:hover {
  color: var(--color-accent);
}

.desk__path-desk {
  color: var(--color-heading);
}

.desk__nav {
  order: 3;
  flex-basis: 100%;
  overflow-x: auto;
}

.desk__nav ul {
  display: flex;
  gap: var(--space-1);
  padding: 0;
  margin: 0;
  list-style: none;
}

.desk__link {
  display: block;
  padding: var(--space-1-5) var(--space-2);
  border-radius: var(--radius-md);
  color: var(--color-text-soft);
  white-space: nowrap;
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);
}

/* A shell-style caret marks the open section; the slot is kept for every item
   so names line up like a directory listing. */
.desk__link::before {
  content: "  " / "";
  white-space: pre;
}

.desk__link:hover {
  background-color: var(--color-hover);
  color: var(--color-hover-text);
}

.desk__link--active,
.desk__link--active:hover {
  color: var(--color-accent);
}

.desk__link--active::before {
  content: "> " / "";
}

.desk__session {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-left: auto;
}

.desk__user {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-text-muted);
}

.desk__avatar {
  border-radius: var(--radius-sm);
}

.desk__login {
  display: none;
}

.desk__tools {
  display: flex;
  align-items: center;
}

.desk__main {
  min-width: 0;
}

.desk__main:focus {
  outline: none;
}

@media (min-width: 48rem) {
  .desk {
    grid-template-rows: none;
    grid-template-columns: 15rem 1fr;
  }

  .desk__sidebar {
    flex-direction: column;
    flex-wrap: nowrap;
    align-items: stretch;
    gap: var(--space-8);
    height: 100dvh;
    padding: var(--space-6) var(--space-4);
    border-right: 1px solid var(--color-rule);
    border-bottom: 0;
  }

  .desk__path {
    padding-inline: var(--space-2);
  }

  .desk__nav {
    order: 0;
    flex: 1;
    flex-basis: auto;
    overflow-x: visible;
  }

  .desk__nav ul {
    flex-direction: column;
  }

  .desk__session {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-3);
    margin-left: 0;
    padding-top: var(--space-4);
    border-top: 1px solid var(--color-border);
  }

  .desk__user {
    padding-inline: var(--space-2);
  }

  .desk__login {
    display: inline;
  }
}
</style>
