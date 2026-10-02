<template>
  <div class="layout">
    <a class="skip-link" href="#main">Skip to content</a>

    <AppHeader />

    <main id="main" class="layout__main" tabindex="-1">
      <slot />
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
  flex: 1;
}

.layout__main:focus {
  outline: none;
}
</style>
