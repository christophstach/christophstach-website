<script setup lang="ts">
const colorMode = useColorMode();

const modes = ["system", "light", "dark"] as const;
type Mode = (typeof modes)[number];

const icons: Record<Mode, string> = {
  system: "tabler:device-desktop",
  light: "tabler:sun",
  dark: "tabler:moon",
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

// The public pages ship no Vue (noScripts in nuxt.config.ts), so the fallback has to
// work on its own, through the helpers of the color-mode script in the document head.
const fallbackScript = `(() => {
  const button = document.currentScript.parentElement;
  const colorMode = window.__NUXT_COLOR_MODE__;
  const modes = ${JSON.stringify(modes)};
  let preference = modes.includes(colorMode.preference) ? colorMode.preference : "system";

  const apply = () => {
    const value = preference === "system" ? colorMode.getColorScheme() : preference;
    colorMode.removeColorScheme(colorMode.value);
    colorMode.addColorScheme(value);
    colorMode.value = value;
    colorMode.preference = preference;
    button.dataset.preference = preference;
    button.title = "Color scheme: " + preference;
    button.setAttribute("aria-label", button.title + ". Activate to switch");
  };

  button.addEventListener("click", () => {
    preference = modes[(modes.indexOf(preference) + 1) % modes.length];
    try {
      localStorage.setItem("nuxt-color-mode", preference);
    } catch {}
    apply();
  });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (preference === "system") apply();
  });
  apply();
})();`;
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
      <Icon :name="icons[preference]" size="20" />
    </button>

    <template #fallback>
      <button type="button" class="icon-button theme-toggle" aria-label="Switch color scheme">
        <Icon name="tabler:sun" class="theme-toggle__sun" size="20" />
        <Icon name="tabler:moon" class="theme-toggle__moon" size="20" />
        <Icon name="tabler:device-desktop" class="theme-toggle__system" size="20" />
        <component :is="'script'" v-html="fallbackScript" />
      </button>
    </template>
  </ClientOnly>
</template>

<style scoped>
/* Before the script has run: reflect the resolved theme. */
.theme-toggle__moon,
.theme-toggle__system {
  display: none;
}

.dark .theme-toggle__sun {
  display: none;
}

.dark .theme-toggle__moon {
  display: block;
}

/* After it has run: show the preference, which may be "system". */
.theme-toggle[data-preference] :is(.theme-toggle__sun, .theme-toggle__moon, .theme-toggle__system) {
  display: none;
}

.theme-toggle[data-preference="light"] .theme-toggle__sun,
.theme-toggle[data-preference="dark"] .theme-toggle__moon,
.theme-toggle[data-preference="system"] .theme-toggle__system {
  display: block;
}
</style>
