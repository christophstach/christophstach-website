<script setup lang="ts">
import { useSeoMeta } from "nuxt/app";

definePageMeta({ layout: "desk" });

useSeoMeta({
  title: "Experience · CV · Desk",
  robots: "noindex, nofollow",
});
</script>

<template>
  <DeskEntryList section="experience" />
</template>
