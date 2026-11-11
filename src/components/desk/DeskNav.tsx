import { For, Show } from "solid-js";
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

  return (
    <nav id="desk-sidebar-body" class={styles.desk__nav} aria-label="Desk sections">
      <ul>
        <For each={deskSections}>
          {(section) => (
            <li>
              <a
                href={section.to}
                title={props.collapsed ? section.label : undefined}
                class={[
                  styles.desk__item,
                  styles.desk__link,
                  { [styles["desk__link--active"] ?? ""]: isActive(section.to) },
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
    </nav>
  );
}
