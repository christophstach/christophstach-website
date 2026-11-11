import { For, Show } from "solid-js";
import { CvText } from "./CvText";
import type { CvWebsiteEntry } from "../data/public-api";
import { IconFileTypePdf } from "./icons";
import type { IconProps } from "./icons";
import type { JSX } from "@solidjs/web";
import { formatMonth } from "../lib/format";
import styles from "./CvTimeline.module.css";

interface CvTimelineProps {
  /** Entries as a CV picks them: /curriculum shows the website CV's. */
  entries: CvWebsiteEntry[];
  /** The marker icon on each entry, e.g. a briefcase. */
  icon: (props: IconProps) => JSX.Element;
}

/** No end month: the entry is ongoing. */
function isOngoing(to: string | undefined): boolean {
  return to === undefined || to === "";
}

export function CvTimeline(props: CvTimelineProps) {
  return (
    <ol class={styles.timeline}>
      <For each={props.entries}>
        {(entry) => (
          <li class={styles.timeline__item}>
            <span
              class={[
                styles.timeline__marker,
                { [styles["timeline__marker--current"] ?? ""]: isOngoing(entry.to) },
              ]}
            >
              <props.icon size={16} />
            </span>

            <h3 class={styles.timeline__title}>
              <CvText text={entry.title} />{" "}
              <span class={styles.timeline__organization}>
                @ <CvText text={entry.organization} />
              </span>
            </h3>

            <p class={styles.timeline__meta}>
              <time>
                {formatMonth(entry.from)} –{" "}
                {isOngoing(entry.to) ? "Now" : formatMonth(entry.to ?? "")}
              </time>
              <Show when={entry.location}>
                {(location) => (
                  <span class={styles.timeline__location}>
                    <CvText text={location()} />
                  </span>
                )}
              </Show>
            </p>

            <Show when={entry.tech !== undefined && entry.tech.length > 0}>
              <ul class={styles.timeline__tech} aria-label="Technologies">
                <For each={entry.tech}>
                  {(tech) => (
                    <li class="chip chip--accent">
                      <CvText text={tech} />
                    </li>
                  )}
                </For>
              </ul>
            </Show>

            <Show when={entry.bullets.length > 0}>
              <ul class={styles.timeline__bullets}>
                <For each={entry.bullets}>
                  {(bullet) => (
                    <li>
                      <CvText text={bullet} />
                    </li>
                  )}
                </For>
              </ul>
            </Show>

            <Show when={entry.links !== undefined && entry.links.length > 0}>
              <p class={styles.timeline__links}>
                <For each={entry.links}>
                  {(link) => (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener"
                      class={["text-link", styles.timeline__link]}
                    >
                      <IconFileTypePdf size={16} />
                      {link.text}
                    </a>
                  )}
                </For>
              </p>
            </Show>
          </li>
        )}
      </For>
    </ol>
  );
}
