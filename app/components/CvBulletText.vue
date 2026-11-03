<script setup lang="ts">
import { bulletParts } from "~/utils/format";

// A bullet of a CV entry, with its [text](https://…) links clickable on the
// website and in the printed PDF.
defineProps<{ text: string }>();
</script>

<template>
  <template v-for="(part, index) in bulletParts(text)" :key="index">
    <a v-if="part.href" :href="part.href" class="cv-bullet-link" target="_blank" rel="noopener">{{
      part.text
    }}</a>
    <template v-else>{{ part.text }}</template>
  </template>
</template>

<style scoped>
.cv-bullet-link {
  color: inherit;
  text-decoration: underline;
}
</style>
