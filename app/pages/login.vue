<script setup lang="ts">
import { useRoute, useSeoMeta } from "nuxt/app";
import { computed } from "vue";

useSeoMeta({
  title: "Sign in",
  robots: "noindex, nofollow",
});

const route = useRoute();

const errors: Record<string, string> = {
  forbidden:
    "This GitHub account doesn't have access to the desk. Sign in with the owner's account.",
  oauth: "GitHub sign-in didn't complete. Try again.",
};

const error = computed(() => errors[String(route.query.error)]);
</script>

<template>
  <div class="container login">
    <h1 class="login__title">Sign in to the desk</h1>

    <p class="login__intro">The desk is private. Sign in with GitHub to open it.</p>

    <p v-if="error" class="login__error" role="alert">{{ error }}</p>

    <!-- A plain link: the OAuth route is a server handler, not an app page. -->
    <a href="/auth/github" class="button button--primary login__action">
      <Icon name="tabler:brand-github" size="16" />
      Sign in with GitHub
    </a>
  </div>
</template>

<style scoped>
.login {
  padding-block: var(--space-16);
}

.login__title {
  font-size: clamp(var(--text-3xl), 5vw, var(--text-4xl));
  font-weight: var(--font-bold);
  letter-spacing: var(--tracking-tight);
}

.login__intro {
  max-width: var(--content-max);
  margin-top: var(--space-4);
  font-size: var(--text-lg);
  color: var(--color-text-soft);
}

.login__error {
  max-width: var(--content-max);
  margin-top: var(--space-6);
  color: var(--color-signal);
}

.login__action {
  margin-top: var(--space-8);
}
</style>
