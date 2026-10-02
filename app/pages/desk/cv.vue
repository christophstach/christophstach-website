<script setup lang="ts">
import DeskEmpty from "~/components/DeskEmpty.vue";
import { useSeoMeta } from "nuxt/app";

definePageMeta({ layout: "desk" });

useSeoMeta({
  title: "CV · Desk",
  robots: "noindex, nofollow",
});
</script>

<template>
  <DeskEmpty title="CV" cwd="~/desk/cv" :output="['total 0']" hint="Nothing here yet." />
</template>
