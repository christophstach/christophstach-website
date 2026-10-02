<script setup lang="ts">
import DeskEmpty from "~/components/DeskEmpty.vue";
import { deskSections } from "~/data/desk";
import { useSeoMeta } from "nuxt/app";

definePageMeta({ layout: "desk" });

useSeoMeta({
  title: "Desk",
  robots: "noindex, nofollow",
});

// The overview lists the other sections the way `ls` lists directories.
const directories = deskSections
  .filter((section) => section.to !== "/desk")
  .map((section) => `${section.label}/`);
</script>

<template>
  <DeskEmpty
    title="Overview"
    cwd="~/desk"
    :output="directories.length ? directories : ['total 0']"
    hint="Pick a section from the sidebar to open it."
  />
</template>
