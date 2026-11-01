<script setup lang="ts">
import { createError, useFetch, useHead, useSeoMeta } from "nuxt/app";
import CvDocument from "~/components/CvDocument.vue";

// The public CV: the primary variant from the database, which
// /christoph-stach-cv.pdf prints.
useSeoMeta({
  robots: "noindex, nofollow",
});

// Chrome writes the document title into the PDF's Title metadata, so this page
// opts out of the site-wide titleTemplate rather than repeating the name.
useHead({
  title: "CV - Christoph Stach",
  titleTemplate: "%s",
});

const { data: cv, error } = await useFetch("/api/cv-print");

if (error.value) {
  throw createError({ ...error.value, fatal: true });
}
</script>

<template>
  <CvDocument v-if="cv" :cv="cv" />
</template>
