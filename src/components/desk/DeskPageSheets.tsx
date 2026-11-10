import { For } from "solid-js";
import { percent } from "../../lib/cv-layout";
import styles from "./DeskPageSheets.module.css";

/** Each page as a small A4 sheet, filled as far down as its text runs. */
export function DeskPageSheets(props: { pages: { fill: number }[] }) {
  return (
    <ol class={styles.sheets}>
      <For each={props.pages}>
        {(page, index) => (
          <li
            class={styles.sheets__page}
            aria-label={`Page ${index() + 1}: ${percent(page.fill)} full`}
          >
            <span class={styles.sheets__sheet} aria-hidden="true">
              <span class={styles.sheets__fill} style={{ "block-size": `${page.fill * 100}%` }} />
            </span>
            <span class={styles.sheets__value} aria-hidden="true">
              {percent(page.fill)}
            </span>
          </li>
        )}
      </For>
    </ol>
  );
}
