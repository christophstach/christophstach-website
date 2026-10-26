<script setup lang="ts">
import { primaryVariant, printVariant } from "~/utils/cv-variant";
import CvDocument from "~/components/CvDocument.vue";

// The public CV: the primary variant, which /christoph-stach-cv.pdf prints.
useSeoMeta({
  robots: "noindex, nofollow",
});

// Chrome writes the document title into the PDF's Title metadata, so this page
// opts out of the site-wide titleTemplate rather than repeating the name.
useHead({
  title: "CV - Christoph Stach",
  titleTemplate: "%s",
});

const cv = printVariant(primaryVariant);
</script>

<template>
  <CvDocument :cv="cv" />
</template>
