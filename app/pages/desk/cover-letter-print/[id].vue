<script setup lang="ts">
import { COVER_LETTER_MARGIN_MM, COVER_LETTER_WORDING } from "~/data/cover-letter-wording";
import { createError, useFetch, useHead, useRoute } from "nuxt/app";
import CoverLetterDocument from "~/components/CoverLetterDocument.vue";

// A cover letter, printed by /api/desk/cover-letters/<id>/pdf and by the desk's
// page check. It lives under /desk so the desk middleware keeps it behind the
// GitHub session, and has no layout because Chrome prints it as is.
definePageMeta({ layout: false });

const route = useRoute();

// During SSR, useFetch passes the request's session cookie on to the API.
const { data: letter, error } = await useFetch(
  `/api/desk/cover-letters/${String(route.params.id)}/print`,
);

if (error.value) {
  throw createError({ ...error.value, fatal: true });
}

useHead({
  title: () =>
    letter.value
      ? `${COVER_LETTER_WORDING[letter.value.language].title} - ${letter.value.profile.name}`
      : "",
  titleTemplate: "%s",
  htmlAttrs: { lang: () => letter.value?.language ?? "en" },
  meta: [{ name: "robots", content: "noindex, nofollow" }],
  style: [
    {
      key: "cover-letter-page",
      textContent: `@page { size: A4; margin: ${COVER_LETTER_MARGIN_MM}mm; }`,
    },
  ],
});
</script>

<template>
  <CoverLetterDocument v-if="letter" :letter="letter" />
</template>
