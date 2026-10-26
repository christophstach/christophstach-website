<script setup lang="ts">
import { createError, useHead, useRoute } from "nuxt/app";
import { findVariant, printVariant } from "~/utils/cv-variant";
import CvDocument from "~/components/CvDocument.vue";

// A private CV variant, printed by /api/desk/cv/<variant>. It lives under /desk
// so the desk middleware keeps it behind the GitHub session, and has no layout
// because Chrome prints it as is.
definePageMeta({ layout: false });

const route = useRoute();
const variant = findVariant(String(route.params.variant));

if (!variant) {
  throw createError({ statusCode: 404, statusMessage: "No such CV variant" });
}

useHead({
  title: "CV - Christoph Stach",
  titleTemplate: "%s",
  meta: [{ name: "robots", content: "noindex, nofollow" }],
});

const cv = printVariant(variant);
</script>

<template>
  <CvDocument :cv="cv" />
</template>
