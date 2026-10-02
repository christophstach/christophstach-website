<script setup lang="ts">
import { navigateTo, useCookie } from "nuxt/app";
import { deskSections } from "~/data/desk";
import { useUserSession } from "#imports";

const { user, clear } = useUserSession();

// A cookie rather than localStorage, so the server renders the sidebar in the
// state it was left in and nothing jumps on hydration.
const collapsed = useCookie<boolean>("desk-sidebar-collapsed", {
  default: () => false,
  maxAge: 60 * 60 * 24 * 365,
  sameSite: "lax",
});

async function signOut() {
  await clear();
  await navigateTo("/");
}
</script>

<template>
  <div class="desk" :class="{ 'desk--collapsed': collapsed }">
    <a class="skip-link" href="#main">Skip to content</a>

    <aside class="desk__sidebar">
      <div class="desk__top">
        <!-- A shell path: `~` leads back to the public site, `/desk` to the desk. -->
        <p class="desk__path">
          <NuxtLink to="/" class="desk__path-home" title="Back to the site">~</NuxtLink
          ><NuxtLink to="/desk" class="desk__path-desk desk__label">/desk</NuxtLink>
        </p>

        <button
          type="button"
          class="icon-button desk__collapse"
          :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
          :title="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
          :aria-expanded="!collapsed"
          aria-controls="desk-sidebar-body"
          @click="collapsed = !collapsed"
        >
          <Icon
            :name="
              collapsed
                ? 'tabler:layout-sidebar-left-expand'
                : 'tabler:layout-sidebar-left-collapse'
            "
            size="20"
          />
        </button>
      </div>

      <nav id="desk-sidebar-body" class="desk__nav" aria-label="Desk sections">
        <ul>
          <li v-for="section in deskSections" :key="section.to">
            <NuxtLink
              :to="section.to"
              :title="collapsed ? section.label : undefined"
              class="desk__item desk__link"
              exact-active-class="desk__link--active"
            >
              <Icon :name="section.icon" size="18" class="desk__icon" />
              <span class="desk__label">{{ section.label }}</span>
            </NuxtLink>
          </li>
        </ul>
      </nav>

      <div class="desk__session">
        <p v-if="user" class="desk__item desk__user" :title="collapsed ? user.login : undefined">
          <img :src="user.avatarUrl" alt="" width="20" height="20" class="desk__avatar" />
          <span class="desk__label">{{ user.login }}</span>
        </p>

        <div class="desk__actions">
          <button
            type="button"
            class="desk__item desk__logout"
            :title="collapsed ? 'Sign out' : undefined"
            @click="signOut"
          >
            <Icon name="tabler:logout" size="18" class="desk__icon" />
            <span class="desk__label">Sign out</span>
          </button>

          <ThemeToggle />
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

/* Below 48rem the sidebar is a top bar: path, session, then the sections. */
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

.desk__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.desk__path {
  font-size: var(--text-base);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-tight);
  white-space: nowrap;
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

/* Collapsing only exists in the side layout. */
.desk__collapse {
  display: none;
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

/* One row shape for sections, the user and sign out, so icons line up in a
   single column whether the sidebar is open or collapsed. */
.desk__item {
  display: flex;
  align-items: center;
  gap: var(--space-2-5);
  padding: var(--space-1-5) var(--space-2);
  border-radius: var(--radius-md);
  white-space: nowrap;
}

.desk__icon {
  flex: none;
}

.desk__link,
.desk__logout {
  color: var(--color-text-soft);
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);
}

.desk__link:hover,
.desk__logout:hover {
  background-color: var(--color-hover);
  color: var(--color-hover-text);
}

.desk__link--active,
.desk__link--active:hover {
  background-color: var(--color-accent-subtle-bg);
  color: var(--color-accent-subtle-text);
}

.desk__session {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  margin-left: auto;
}

.desk__user {
  color: var(--color-text-muted);
}

.desk__avatar {
  flex: none;
  border-radius: var(--radius-sm);
}

.desk__actions {
  display: flex;
  align-items: center;
}

.desk__logout {
  flex: 1;
}

/* Top bar: user and sign out show as icons only. Labels stay readable to
   screen readers. */
.desk__session .desk__label,
.desk--collapsed .desk__label {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
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
    transition: grid-template-columns 180ms ease;
  }

  .desk--collapsed {
    grid-template-columns: 3.75rem 1fr;
  }

  .desk__sidebar {
    flex-direction: column;
    flex-wrap: nowrap;
    align-items: stretch;
    gap: var(--space-6);
    height: 100dvh;
    padding: var(--space-4) var(--space-2-5);
    overflow: hidden;
    border-right: 1px solid var(--color-rule);
    border-bottom: 0;
  }

  .desk__path {
    padding-inline: var(--space-2);
  }

  .desk__collapse {
    display: inline-flex;
  }

  .desk__nav {
    order: 0;
    flex: 1;
    flex-basis: auto;
    overflow: visible;
  }

  .desk__nav ul {
    flex-direction: column;
  }

  .desk__session {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-2);
    margin-left: 0;
    padding-top: var(--space-3);
    border-top: 1px solid var(--color-border);
  }

  .desk__session .desk__label {
    position: static;
    width: auto;
    height: auto;
    overflow: visible;
    clip-path: none;
  }

  /* Separates who is signed in from the actions on that session. */
  .desk__actions {
    padding-top: var(--space-2);
    border-top: 1px solid var(--color-border);
  }

  /* Collapsed: a column of icons. The path shrinks to `~`, and the actions
     stack so both fit the narrow rail. */
  .desk--collapsed .desk__top {
    flex-direction: column;
    gap: var(--space-3);
  }

  .desk--collapsed .desk__path {
    padding-inline: 0;
  }

  .desk--collapsed .desk__item {
    justify-content: center;
    padding-inline: 0;
  }

  .desk--collapsed .desk__actions {
    flex-direction: column;
    gap: var(--space-1);
  }

  .desk--collapsed .desk__logout {
    width: 100%;
  }

  .desk--collapsed .desk__session .desk__label {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
}

@media (min-width: 48rem) and (prefers-reduced-motion: reduce) {
  .desk {
    transition: none;
  }
}
</style>
