import { For } from "solid-js";
import { ThemeToggle } from "./ThemeToggle";
import { getColorMode } from "../lib/color-mode";
import styles from "./AppHeader.module.css";
import { useLocation } from "@solidjs/router";

const LINKS = [
  { to: "/", text: "Home" },
  { to: "/curriculum", text: "Curriculum" },
] as const;

export function AppHeader() {
  const location = useLocation();

  return (
    <header class={styles.header}>
      <div class={["container", styles.inner]}>
        <a href="/" class={styles.brand}>
          <span class={styles.brandLong}>Christoph</span>
          <span class={styles.brandShort}>C.</span>
          <span class={styles.brandAccent}>Stach</span>
        </a>

        <nav class={styles.nav}>
          <For each={LINKS}>
            {(link) => (
              <a
                href={link.to}
                class={[styles.link, { [styles.active ?? ""]: location.pathname === link.to }]}
              >
                {link.text}
              </a>
            )}
          </For>

          <ThemeToggle initial={getColorMode()} />
        </nav>
      </div>
    </header>
  );
}
