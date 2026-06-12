<script setup lang="ts">
import { Monitor, Moon, Sun } from "lucide-vue-next";

const colorMode = useColorMode();

const modes = ["system", "light", "dark"] as const;
type Mode = (typeof modes)[number];

const icons: Record<Mode, typeof Sun> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};

const preference = computed<Mode>(() =>
  modes.includes(colorMode.preference as Mode) ? (colorMode.preference as Mode) : "system",
);

function cycle() {
  const next = modes[(modes.indexOf(preference.value) + 1) % modes.length];

  if (next) {
    colorMode.preference = next;
  }
}
</script>

<template>
  <ClientOnly>
    <button
      type="button"
      class="icon-button"
      :aria-label="`Color scheme: ${preference}. Activate to switch`"
      :title="`Color scheme: ${preference}`"
      @click="cycle"
    >
      <component :is="icons[preference]" :size="20" />
    </button>

    <template #fallback>
      <span class="icon-button" aria-hidden="true">
        <Sun class="theme-toggle__sun" :size="20" />
        <Moon class="theme-toggle__moon" :size="20" />
      </span>
    </template>
  </ClientOnly>
</template>

<style scoped>
/* Pre-hydration fallback: reflect the resolved theme via CSS until the
   preference is known on the client. */
.theme-toggle__moon {
  display: none;
}

.dark .theme-toggle__sun {
  display: none;
}

.dark .theme-toggle__moon {
  display: block;
}
</style>
