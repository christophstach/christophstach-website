<script setup lang="ts">
import { createError, useFetch, useHead, useRoute } from "nuxt/app";
import CvDocument from "~/components/CvDocument.vue";

// A private CV variant, printed by /api/desk/cv/<variant> and by the desk's
// page check. It lives under /desk
// so the desk middleware keeps it behind the GitHub session, and has no layout
// because Chrome prints it as is.
definePageMeta({ layout: false });

const route = useRoute();

useHead({
  title: "CV - Christoph Stach",
  titleTemplate: "%s",
  meta: [{ name: "robots", content: "noindex, nofollow" }],
});

// During SSR, useFetch passes the request's session cookie on to the API.
// Layout steps in the page's query are passed on, to try them unsaved.
const { data: cv, error } = await useFetch(
  `/api/desk/cv-variants/${String(route.params.variant)}/print`,
  {
    query: {
      spacing: route.query.spacing,
      textSize: route.query.textSize,
      margin: route.query.margin,
    },
  },
);

if (error.value) {
  throw createError({ ...error.value, fatal: true });
}
</script>

<template>
  <CvDocument v-if="cv" :cv="cv" />
</template>
