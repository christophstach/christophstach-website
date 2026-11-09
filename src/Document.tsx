import { THEME_COLORS, getColorMode } from "./lib/color-mode";
import { COLOR_MODE_SCRIPT } from "./color-mode-script";
import { HydrationScript } from "@solidjs/web";
import type { ParentProps } from "solid-js";
import monoLatin from "@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2?url";
import plexLatin from "@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff2?url";

// The document shell, picked up by the src/Document.* convention. A light or
// dark choice is rendered here; "system" needs the head script.
export default function Document(props: ParentProps) {
  const mode = getColorMode();

  return (
    <html lang="en" class={mode === "dark" ? "dark" : undefined}>
      <head>
        {mode === "system" && <script innerHTML={COLOR_MODE_SCRIPT} />}
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* The latin regular of both fonts, which every page renders first. */}
        <link rel="preload" as="font" type="font/woff2" crossorigin="anonymous" href={monoLatin} />
        <link rel="preload" as="font" type="font/woff2" crossorigin="anonymous" href={plexLatin} />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        {mode === "system" ? (
          <>
            {/* One tag per system scheme, so the browser chrome is right before the script runs. */}
            <meta
              name="theme-color"
              media="(prefers-color-scheme: light)"
              content={THEME_COLORS.light}
            />
            <meta
              name="theme-color"
              media="(prefers-color-scheme: dark)"
              content={THEME_COLORS.dark}
            />
          </>
        ) : (
          <meta name="theme-color" content={THEME_COLORS[mode]} />
        )}
        <HydrationScript />
      </head>
      <body>{props.children}</body>
    </html>
  );
}
