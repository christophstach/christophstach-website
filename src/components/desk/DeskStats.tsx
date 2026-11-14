import { For } from "solid-js";
import styles from "./DeskStats.module.css";

interface DeskStat {
  /** Where the count is dealt with. */
  to: string;
  label: string;
  count: number;
  /** Draws the count in the signal colour. */
  warn?: boolean;
}

/** A panel's row of counts, each a link: the cells under a panel head. */
export function DeskStats(props: { stats: readonly DeskStat[] }) {
  return (
    <ul class={styles.stats}>
      <For each={props.stats}>
        {(stat) => (
          <li>
            <a href={stat.to} class={[styles.stat, stat.warn ? styles["stat--warn"] : undefined]}>
              <span class={styles.stat__count}>{stat.count}</span>
              <span class={styles.stat__label}>{stat.label}</span>
            </a>
          </li>
        )}
      </For>
    </ul>
  );
}

export type { DeskStat };
