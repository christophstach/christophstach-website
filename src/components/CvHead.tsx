import { For, Show } from "solid-js";
import { CvText } from "./CvText";
import type { ParentProps } from "solid-js";
import type { Profile } from "../data/cv";
import { stripScheme } from "../lib/format";
import styles from "./CvHead.module.css";

interface CvHeadProps extends ParentProps {
  profile: Profile;
  /** Printed under the name; a cover letter passes it, the CV doesn't. */
  role?: string | undefined;
}

/**
 * The head of the printed CV and of a cover letter, so the two read as one
 * set. The children are what a document adds between the role and the
 * contact lines.
 */
export function CvHead(props: CvHeadProps) {
  return (
    <header class={styles.cv__header}>
      <h1 class={styles.cv__name}>{props.profile.name}</h1>
      <Show when={props.role}>
        {(role) => (
          <p class={styles.cv__role}>
            <CvText text={role()} />
          </p>
        )}
      </Show>
      {props.children}
      <Show
        when={
          props.profile.location !== "" || props.profile.email !== "" || props.profile.phone !== ""
        }
      >
        <ul class={styles.cv__contact}>
          <Show when={props.profile.location}>
            {(location) => (
              <li>
                <CvText text={location()} />
              </li>
            )}
          </Show>
          <Show when={props.profile.email}>
            {(email) => (
              <li>
                <a href={`mailto:${email()}`}>{email()}</a>
              </li>
            )}
          </Show>
          <Show when={props.profile.phone}>
            {(phone) => (
              <li>
                <a href={`tel:${phone().replaceAll(" ", "")}`}>{phone()}</a>
              </li>
            )}
          </Show>
        </ul>
      </Show>
      <Show when={props.profile.links.length > 0}>
        <ul class={[styles.cv__contact, styles["cv__contact--links"]]}>
          <For each={props.profile.links} keyed={(link) => link.href}>
            {(link) => (
              <li>
                <a href={link().href}>{stripScheme(link().href)}</a>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </header>
  );
}
