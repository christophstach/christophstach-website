import { For, Show } from "solid-js";
import { CvHead } from "./CvHead";
import type { PrintedCoverLetter } from "../data/cover-letters";
import { formatDay } from "../lib/format";
import { paragraphs } from "../lib/cover-letter";
import styles from "./CoverLetterDocument.module.css";

/**
 * A cover letter: the print page prints it, the desk editor shows it live
 * while writing. The print page owns the @page rule, so this never affects
 * the desk.
 */
export function CoverLetterDocument(props: { letter: PrintedCoverLetter }) {
  return (
    <article class={[styles.letter, "cv-paper"]} lang={props.letter.language}>
      <CvHead profile={props.letter.profile} role={props.letter.role} />

      <p class={styles.letter__to}>
        <strong class={styles.letter__company}>{props.letter.company}</strong>
        <Show when={props.letter.recipient !== ""}>
          <br />
          {props.letter.recipient}
        </Show>
      </p>

      <Show when={props.letter.letterDate !== ""}>
        <p class={styles.letter__date}>
          {formatDay(props.letter.letterDate, props.letter.language)}
        </p>
      </Show>

      <Show when={props.letter.subject !== ""}>
        <h2 class={styles.letter__subject}>{props.letter.subject}</h2>
      </Show>

      <Show when={props.letter.salutation !== ""}>
        <p class={styles.letter__salutation}>{props.letter.salutation}</p>
      </Show>

      <For each={paragraphs(props.letter.body)}>
        {(paragraph) => <p class={styles.letter__paragraph}>{paragraph}</p>}
      </For>

      <div class={styles.letter__signature}>
        <Show when={props.letter.closing !== ""}>
          <p>{props.letter.closing}</p>
        </Show>
        <p class={styles.letter__name}>{props.letter.profile.name}</p>
      </div>
    </article>
  );
}
