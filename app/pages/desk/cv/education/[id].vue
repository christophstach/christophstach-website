<script setup lang="ts">
import { useRoute } from "nuxt/app";

definePageMeta({ layout: "desk" });

const route = useRoute();
</script>

<template>
  <DeskEntryEditor section="education" :id="String(route.params.id)" />
</template>
