<script setup lang="ts">
import { useRoute } from "nuxt/app";

definePageMeta({ layout: "desk" });

const route = useRoute();
</script>

<template>
  <DeskEntryEditor section="experience" :id="String(route.params.id)" />
</template>
