// The color mode is remembered in a cookie, so the server can render the
// page in the visitor's choice. "system" (also a missing or unknown value)
// leaves it to the browser: the head script in src/color-mode-script.ts.
import { getRequestEvent, isServer } from "@solidjs/web";

function readCookie(header: string | null | undefined, name: string): string | undefined {
  for (const part of header?.split(";") ?? []) {
    const [key, value] = part.split("=");

    if (key?.trim() === name) {
      return value?.trim();
    }
  }

  return undefined;
}

export type ColorMode = "light" | "dark" | "system";

export const COLOR_MODES: readonly ColorMode[] = ["system", "light", "dark"];

export const COLOR_MODE_COOKIE = "color-mode";

// Readable by script (not HttpOnly): the toggle writes it.
export const COLOR_MODE_COOKIE_ATTRIBUTES = "Path=/; Max-Age=31536000; SameSite=Lax";

// The browser chrome color per resolved scheme, as in the Nuxt app.vue.
export const THEME_COLORS = { light: "#f5f7f7", dark: "#080b0a" } as const;

export function parseColorMode(value: string | null | undefined): ColorMode {
  return COLOR_MODES.find((mode) => mode === value) ?? "system";
}

export function colorModeCookie(mode: ColorMode): string {
  return `${COLOR_MODE_COOKIE}=${mode}; ${COLOR_MODE_COOKIE_ATTRIBUTES}`;
}

// The server reads the request cookie; the client reads the same cookie from
// the document, so both sides of a hydration agree.
export function getColorMode(): ColorMode {
  const header = isServer ? getRequestEvent()?.request.headers.get("cookie") : document.cookie;

  return parseColorMode(readCookie(header, COLOR_MODE_COOKIE));
}
