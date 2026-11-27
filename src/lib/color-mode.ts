// The color mode is remembered in a browser cookie. SSR stays cookie-free so
// public pages can be cached at the edge (ISR): the inline head script in
// src/color-mode-script.ts resolves the cookie (or device preference) before
// first paint, and ThemeToggle syncs its control state after hydration.

export type ColorMode = "light" | "dark" | "system";

export const COLOR_MODES: readonly ColorMode[] = ["system", "light", "dark"];

export const COLOR_MODE_COOKIE = "color-mode";

// Readable by script (not HttpOnly): the toggle writes it.
export const COLOR_MODE_COOKIE_ATTRIBUTES = "Path=/; Max-Age=31536000; SameSite=Lax";

// The browser chrome color per resolved scheme.
export const THEME_COLORS = { light: "#f5f7f7", dark: "#080b0a" } as const;

export function parseColorMode(value: string | null | undefined): ColorMode {
  return COLOR_MODES.find((mode) => mode === value) ?? "system";
}

export function colorModeCookie(mode: ColorMode): string {
  const secure = typeof window !== "undefined" && window.location.protocol === "https:";

  return `${COLOR_MODE_COOKIE}=${mode}; ${COLOR_MODE_COOKIE_ATTRIBUTES}${secure ? "; Secure" : ""}`;
}
