import { COLOR_MODES, THEME_COLORS, colorModeCookie } from "../lib/color-mode";
import { IconDeviceDesktop, IconMoon, IconSun } from "./icons";
import { createSignal, onSettled } from "solid-js";
import type { ColorMode } from "../lib/color-mode";
import { Dynamic } from "@solidjs/web";

const ICONS = { system: IconDeviceDesktop, light: IconSun, dark: IconMoon };

const DARK_QUERY = "(prefers-color-scheme: dark)";

// Puts the resolved scheme on <html> and into the theme-color tags.
function applyColorMode(mode: ColorMode) {
  const dark = mode === "dark" || (mode === "system" && matchMedia(DARK_QUERY).matches);

  document.documentElement.classList.toggle("dark", dark);

  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    meta.setAttribute("content", dark ? THEME_COLORS.dark : THEME_COLORS.light);
  }
}

// Cycles system → light → dark. `initial` is the mode the server rendered,
// so the hydrated button matches the server markup.
export function ThemeToggle(props: { initial: ColorMode }) {
  const [mode, setMode] = createSignal(() => props.initial);

  const cycle = () => {
    const next = COLOR_MODES[(COLOR_MODES.indexOf(mode()) + 1) % COLOR_MODES.length] ?? "system";

    setMode(next);
    document.cookie = colorModeCookie(next);
    applyColorMode(next);
  };

  // While on "system", follow the device when it switches.
  const follow = () => {
    if (mode() === "system") {
      applyColorMode("system");
    }
  };

  onSettled(() => {
    const media = matchMedia(DARK_QUERY);

    media.addEventListener("change", follow);

    return () => media.removeEventListener("change", follow);
  });

  return (
    <button
      type="button"
      class="icon-button"
      aria-label={`Color scheme: ${mode()}. Activate to switch`}
      title={`Color scheme: ${mode()}`}
      onClick={cycle}
    >
      <Dynamic component={ICONS[mode()]} size={20} />
    </button>
  );
}
