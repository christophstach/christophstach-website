import { AppFooter } from "./AppFooter";
import { AppHeader } from "./AppHeader";
import type { ParentProps } from "solid-js";
import styles from "./SiteLayout.module.css";

/** The public chrome: skip link, header, the page, footer. */
export function SiteLayout(props: ParentProps) {
  return (
    <div class={styles.layout}>
      <a class="skip-link" href="#main">
        Skip to content
      </a>

      <AppHeader />

      <main id="main" class={styles.main} tabindex="-1">
        {props.children}
      </main>

      <AppFooter />
    </div>
  );
}
