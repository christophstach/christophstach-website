<script setup lang="ts">
const links = [
  { to: "/", text: "Home" },
  { to: "/curriculum", text: "Curriculum" },
];
</script>

<template>
  <header class="header">
    <div class="container header__inner">
      <NuxtLink to="/" class="header__brand">
        <span class="header__brand-long">Christoph</span>
        <span class="header__brand-short">C.</span>
        <span class="header__brand-accent">Stach</span>
      </NuxtLink>

      <nav class="header__nav">
        <NuxtLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="header__link"
          exact-active-class="header__link--active"
        >
          {{ link.text }}
        </NuxtLink>

        <ThemeToggle />
      </nav>
    </div>
  </header>
</template>

<style scoped>
.header {
  position: sticky;
  top: 0;
  z-index: var(--z-header);
  border-bottom: 1px solid var(--color-border-strong);
  background-color: var(--color-bg-translucent);
  backdrop-filter: blur(8px);
}

.header__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--header-height);
}

.header__brand {
  font-family: var(--font-mono);
  font-size: var(--text-base);
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-tight);
  color: var(--color-heading);
}

.header__brand::before {
  content: "~/";
  color: var(--color-text-muted);
  font-weight: var(--font-regular);
}

.header__brand-accent {
  color: var(--color-accent);
}

/* Abbreviate the brand below 40rem so brand, nav, and toggle fit on
   320px viewports without wrapping. */
.header__brand-long {
  display: none;
}

@media (min-width: 40rem) {
  .header__brand-long {
    display: inline;
  }

  .header__brand-short {
    display: none;
  }
}

.header__nav {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

@media (min-width: 40rem) {
  .header__nav {
    gap: var(--space-2);
  }
}

.header__link {
  padding: var(--space-2);
  border-radius: var(--radius-md);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-soft);
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);
}

@media (min-width: 40rem) {
  .header__link {
    padding: var(--space-2) var(--space-3);
  }
}

.header__link:hover {
  background-color: var(--color-hover);
  color: var(--color-hover-text);
}

.header__link--active {
  color: var(--color-accent);
}

.header__link--active:hover {
  color: var(--color-accent);
}
</style>
