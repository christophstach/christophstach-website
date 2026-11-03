<script setup lang="ts">
import { textParts } from "~/utils/format";

// A text of the CV, with its [text](https://…) links clickable on the website
// and in the printed PDF.
defineProps<{ text: string }>();
</script>

<template>
  <template v-for="(part, index) in textParts(text)" :key="index">
    <a v-if="part.href" :href="part.href" class="cv-text-link" target="_blank" rel="noopener">{{
      part.text
    }}</a>
    <template v-else>{{ part.text }}</template>
  </template>
</template>

<style scoped>
.cv-text-link {
  color: inherit;
  text-decoration: underline;
}
</style>
