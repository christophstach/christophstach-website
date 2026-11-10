import { For, Show, createEffect, createSignal } from "solid-js";
import { DeskPageSheets } from "./DeskPageSheets";
import { checkDeskLetterPages } from "../../lib/desk/letters";
import { deskLetterPdfPath } from "../../data/endpoints";
import { errorMessage } from "../../lib/desk/request";
import { letterWarnings } from "../../lib/cv-layout";
import { revalidate } from "@solidjs/router";
import styles from "./DeskCoverLetterPages.module.css";

interface DeskCoverLetterPagesProps {
  /** Id of the cover letter to check. */
  id: string;
  /** Bumped after the letter is saved, to check it again. */
  revision: number;
}

type Check = Awaited<ReturnType<typeof checkDeskLetterPages>>;

/** Prints the letter's PDF and shows how full its page is, with warnings. */
export function DeskCoverLetterPages(props: DeskCoverLetterPagesProps) {
  const [check, setCheck] = createSignal<Check | undefined>();
  const [error, setError] = createSignal("");
  const warnings = () => {
    const result = check();

    return result === undefined ? [] : letterWarnings(result.pages.map((page) => page.fill));
  };

  // Runs in the browser only: printing a PDF means a few seconds of Chrome.
  // The check is stored with the letter; the list shows it.
  createEffect(
    () => ({ id: props.id, revision: props.revision }),
    ({ id }) => {
      let current = true;

      setCheck(undefined);
      setError("");
      void (async () => {
        try {
          const result = await checkDeskLetterPages(id);

          if (current) {
            setCheck(result);
            revalidate("desk-cover-letters");
          }
        } catch (error_) {
          if (current) {
            setError(errorMessage(error_));
          }
        }
      })();

      return () => {
        current = false;
      };
    },
  );

  return (
    <section class={styles["letter-pages"]} aria-labelledby="letter-pages-title">
      <h2 id="letter-pages-title" class={styles["letter-pages__title"]}>
        Pages
      </h2>

      <Show
        when={error() === ""}
        fallback={<p class={styles["letter-pages__note"]}>Couldn't read the PDF. {error()}</p>}
      >
        <Show
          when={check()}
          fallback={<p class={styles["letter-pages__note"]}>Printing the PDF to measure it…</p>}
        >
          {(result) => (
            <>
              <DeskPageSheets pages={result().pages} />
              <Show
                when={warnings().length > 0}
                fallback={<p class={styles["letter-pages__note"]}>Fits on one page.</p>}
              >
                <ul class={styles["letter-pages__warnings"]} role="status">
                  <For each={warnings()}>{(warning) => <li>{warning}</li>}</For>
                </ul>
              </Show>
            </>
          )}
        </Show>
      </Show>

      <p class={styles["letter-pages__note"]}>
        <a href={deskLetterPdfPath(props.id)} class="text-link" target="_blank">
          Open the PDF
        </a>{" "}
        (the last saved version).
      </p>
    </section>
  );
}
