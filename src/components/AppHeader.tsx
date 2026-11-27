import { For } from "solid-js";
import { ThemeToggle } from "./ThemeToggle";
import { getColorMode } from "../lib/color-mode";
import { paths } from "../router";
import styles from "./AppHeader.module.css";
import { useLocation } from "@solidjs/router";

const LINKS = [
  { id: "nav-home", to: paths(), text: "Home" },
  { id: "nav-curriculum", to: paths.curriculum(), text: "Curriculum" },
] as const;

export function AppHeader() {
  const location = useLocation();

  return (
    <header class={styles.header}>
      <div class={["container", styles.inner]}>
        <a
          id="header-brand"
          href={paths()}
          class={styles.brand}
          aria-label="Christoph Stach — Home"
        >
          <span class={styles.brandLong} aria-hidden="true">
            Christoph
          </span>
          <span class={styles.brandShort} aria-hidden="true">
            C.
          </span>
          <span class={styles.brandAccent} aria-hidden="true">
            Stach
          </span>
        </a>

        <div class={styles.actions}>
          <nav id="primary-nav" class={styles.nav} aria-label="Primary">
            <For each={LINKS}>
              {(link) => (
                <a
                  id={link.id}
                  href={link.to}
                  aria-current={location.pathname === link.to ? "page" : undefined}
                  class={[styles.link, { [styles.active ?? ""]: location.pathname === link.to }]}
                >
                  {link.text}
                </a>
              )}
            </For>
          </nav>

          <div id="header-theme-control" class={styles.control}>
            <ThemeToggle initial={getColorMode()} />
          </div>
        </div>
      </div>
    </header>
  );
}
