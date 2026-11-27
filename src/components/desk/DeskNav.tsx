import { For, Show, createMemo } from "solid-js";
import type { DeskSection } from "../../data/desk";
import { deskSections } from "../../data/desk";
import { paths } from "../../router";
import styles from "./DeskLayout.module.css";
import { useLocation } from "@solidjs/router";

/** The desk sections, each with its pages under it while the sidebar is open. */
export function DeskNav(props: { collapsed: boolean }) {
  const location = useLocation();

  // The overview is active on /desk only, a section on its subpages too.
  const isActive = (to: string) =>
    to === paths.desk()
      ? location.pathname === to
      : location.pathname === to || location.pathname.startsWith(`${to}/`);

  const hasActiveChild = (section: DeskSection) =>
    section.pages?.some((link) => isActive(link.to)) === true;

  // Below 48rem the nested lists under each section are hidden; surface the
  // active section's child routes in a compact horizontal strip instead.
  const activeSubnav = createMemo(() => {
    const match = deskSections.find((section) => isActive(section.to) || hasActiveChild(section));

    return match?.pages !== undefined && match.pages.length > 0
      ? { label: match.label, pages: match.pages }
      : undefined;
  });

  return (
    <nav id="desk-sidebar-body" class={styles.desk__nav} aria-label="Desk sections">
      <ul class={styles["desk__nav-list"]}>
        <For each={deskSections}>
          {(section) => (
            <li class={{ [styles["desk__nav-home"] ?? ""]: section.to === paths.desk() }}>
              <a
                href={section.to}
                title={props.collapsed ? section.label : undefined}
                aria-current={isActive(section.to) && !hasActiveChild(section) ? "page" : undefined}
                class={[
                  styles.desk__item,
                  styles.desk__link,
                  {
                    [styles["desk__link--active"] ?? ""]:
                      isActive(section.to) && !hasActiveChild(section),
                    [styles["desk__link--parent"] ?? ""]: hasActiveChild(section),
                  },
                ]}
              >
                <section.icon size={18} class={styles.desk__icon} />
                <span class={styles.desk__label}>{section.label}</span>
              </a>

              <Show when={!props.collapsed && section.pages}>
                <ul class={styles.desk__content} aria-label={section.label}>
                  <For each={section.pages}>
                    {(link) => (
                      <li>
                        <a
                          href={link.to}
                          aria-current={isActive(link.to) ? "page" : undefined}
                          class={[
                            styles["desk__content-link"],
                            {
                              [styles["desk__content-link--active"] ?? ""]: isActive(link.to),
                            },
                          ]}
                        >
                          <link.icon size={14} />
                          {link.label}
                        </a>
                      </li>
                    )}
                  </For>
                </ul>
              </Show>
            </li>
          )}
        </For>
      </ul>

      <Show when={activeSubnav()}>
        {(subnav) => (
          <ul class={styles.desk__subnav} aria-label={`${subnav().label} pages`}>
            <For each={subnav().pages}>
              {(link) => (
                <li>
                  <a
                    href={link.to}
                    aria-current={isActive(link.to) ? "page" : undefined}
                    class={[
                      styles["desk__subnav-link"],
                      {
                        [styles["desk__subnav-link--active"] ?? ""]: isActive(link.to),
                      },
                    ]}
                  >
                    <link.icon size={14} class={styles.desk__icon} />
                    {link.label}
                  </a>
                </li>
              )}
            </For>
          </ul>
        )}
      </Show>
    </nav>
  );
}
