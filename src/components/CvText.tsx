import { For } from "solid-js";
import styles from "./CvText.module.css";
import { textParts } from "../lib/format";

/**
 * A text of the CV, with its [text](https://…) links clickable on the website
 * and in the printed PDF. Everything else renders as plain text.
 */
export function CvText(props: { text: string }) {
  return (
    <For each={textParts(props.text)}>
      {(part) =>
        part.href === undefined ? (
          part.text
        ) : (
          <a href={part.href} class={styles.link} target="_blank" rel="noopener">
            {part.text}
          </a>
        )
      }
    </For>
  );
}
