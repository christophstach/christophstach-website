import { AppFooter } from "./AppFooter";
import { AppHeader } from "./AppHeader";
import type { ParentProps } from "solid-js";
import styles from "./SiteLayout.module.css";
import cvTextStyles from "./CvText.module.css";
import cvTimelineStyles from "./CvTimeline.module.css";
import curriculumStyles from "./curriculum/curriculum.module.css";
import homeStyles from "./home/home.module.css";

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

/**
 * The "use server" pages never reach the client build, and the build leaves
 * out a stylesheet nothing in it uses; listed here, theirs ship with the chrome.
 */
export const SERVER_PAGE_STYLES = [homeStyles, curriculumStyles, cvTimelineStyles, cvTextStyles];
