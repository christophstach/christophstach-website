<script setup lang="ts">
const year = new Date().getFullYear();
</script>

<template>
  <footer class="footer">
    <div class="container footer__inner">
      <small>&copy; 2022–{{ year }} Christoph Stach</small>

      <div class="footer__social">
        <a
          href="https://www.linkedin.com/in/christoph-stach-7586b958"
          target="_blank"
          rel="noopener"
          aria-label="LinkedIn profile"
          class="icon-button"
        >
          <Icon name="tabler:brand-linkedin" size="20" />
        </a>
        <a
          href="https://github.com/christophstach"
          target="_blank"
          rel="noopener"
          aria-label="GitHub profile"
          class="icon-button"
        >
          <Icon name="tabler:brand-github" size="20" />
        </a>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  border-top: 1px solid var(--color-border-strong);
}

.footer__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--header-height);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.footer__social {
  display: flex;
  gap: var(--space-1);
}
</style>
