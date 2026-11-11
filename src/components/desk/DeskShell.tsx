import { IconLayoutSidebarLeftCollapse, IconLayoutSidebarLeftExpand } from "../icons";
import { Show, createEffect, createMemo, createSignal } from "solid-js";
import { DeskNav } from "./DeskNav";
import { DeskSession } from "./DeskSession";
import type { ParentProps } from "solid-js";
import { getDeskCoverLetters, getDeskVariants } from "../../lib/desk/queries";
import { letterChecks, variantChecks } from "../../lib/desk/page-checks";
import { checkDeskLetterPages } from "../../lib/desk/letters";
import { checkVariantPages } from "../../lib/desk/variants";
import { pageCookie } from "../../lib/cookies";
import { paths } from "../../router";
import styles from "./DeskLayout.module.css";

// A cookie rather than localStorage, so the server renders the sidebar in the
// state it was left in and nothing jumps on hydration.
const COLLAPSED_COOKIE = "desk-sidebar-collapsed";

/** The desk's frame: the sidebar with its sections, the session, the page. */
export function DeskShell(props: ParentProps) {
  const variants = createMemo(() => getDeskVariants());
  const letters = createMemo(() => getDeskCoverLetters());

  // After a deploy no variant or letter has a page check on the new build, nor
  // does one written straight to the database; run them in the background
  // (browser only) so the lists show every page status.
  createEffect(
    () => variants().variants,
    (list) => {
      void variantChecks.checkMissing(list, (id) => checkVariantPages({ id }));
    },
  );
  createEffect(
    () => letters(),
    (list) => {
      void letterChecks.checkMissing(list, (id) => checkDeskLetterPages(id));
    },
  );

  const [collapsed, setCollapsed] = createSignal(pageCookie(COLLAPSED_COOKIE) === "true");

  function toggleCollapsed() {
    const next = !collapsed();

    setCollapsed(next);
    document.cookie = `${COLLAPSED_COOKIE}=${String(next)}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }

  return (
    <div class={[styles.desk, { [styles["desk--collapsed"] ?? ""]: collapsed() }]}>
      <a class="skip-link" href="#main">
        Skip to content
      </a>

      <aside class={styles.desk__sidebar}>
        <div class={styles.desk__top}>
          {/* A shell path: `~` leads back to the public site, `/desk` to the desk. */}
          <p class={styles.desk__path}>
            <a href={paths()} class={styles["desk__path-home"]} title="Back to the site">
              ~
            </a>
            <a href={paths.desk()} class={[styles["desk__path-desk"], styles.desk__label]}>
              /desk
            </a>
          </p>

          <button
            type="button"
            class={["icon-button", styles.desk__collapse]}
            aria-label={collapsed() ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed() ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={collapsed() ? "false" : "true"}
            aria-controls="desk-sidebar-body"
            onClick={toggleCollapsed}
          >
            <Show when={collapsed()} fallback={<IconLayoutSidebarLeftCollapse size={20} />}>
              <IconLayoutSidebarLeftExpand size={20} />
            </Show>
          </button>
        </div>

        <DeskNav collapsed={collapsed()} />

        <DeskSession collapsed={collapsed()} />
      </aside>

      <main id="main" class={styles.desk__main} tabindex="-1">
        {props.children}
      </main>
    </div>
  );
}
