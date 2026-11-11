import { CV_PDF_PATH, deskCvPdfPath } from "../../data/endpoints";
import { For, Show, createEffect, createSignal } from "solid-js";
import type { CvLayout } from "../../data/cv-print-layout";
import { DeskPageSheets } from "./DeskPageSheets";
import { checkCvPages } from "../../lib/desk/cvs";
import { errorMessage } from "../../lib/desk/request";
import { layoutWarnings } from "../../lib/cv-layout";
import { revalidate } from "@solidjs/router";
import styles from "./DeskCvPdf.module.css";

interface DeskCvPdfProps {
  /** Id of the CV to check. */
  cv: string;
  /** Whether it is the public CV, the PDF that visitors download. */
  primary: boolean;
  /** Bumped after the CV is saved, to check it again. */
  revision: number;
  /** Unsaved layout steps to print instead of the stored ones, or undefined. */
  trial: CvLayout | undefined;
}

type Check = Awaited<ReturnType<typeof checkCvPages>>;

/** Prints a CV's PDF and shows how full each page is, with warnings. */
export function DeskCvPdf(props: DeskCvPdfProps) {
  const [check, setCheck] = createSignal<Check | undefined>();
  const [error, setError] = createSignal("");
  const warnings = () => {
    const result = check();

    return result === undefined ? [] : layoutWarnings(result.pages.map((page) => page.fill));
  };

  // Runs in the browser only: printing a PDF means a few seconds of Chrome.
  // The check of the stored steps is stored with the CV, so the overview
  // shows it; a trial isn't.
  createEffect(
    () => ({ id: props.cv, revision: props.revision, trial: props.trial }),
    ({ id, trial }) => {
      let current = true;

      setCheck(undefined);
      setError("");
      void (async () => {
        try {
          const result = await checkCvPages(trial === undefined ? { id } : { id, trial });

          if (current) {
            setCheck(result);

            if (!result.trial) {
              revalidate("desk-cvs");
            }
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
    <section class={styles["cv-pdf"]} aria-labelledby="cv-pdf-title">
      <div class={styles["cv-pdf__head"]}>
        <h2 id="cv-pdf-title" class={styles["cv-pdf__title"]}>
          Pages
        </h2>
        <Show when={check()?.trial === true}>
          <span class={styles["cv-pdf__trial"]}>unsaved layout</span>
        </Show>
      </div>

      <Show
        when={error() === ""}
        fallback={<p class={styles["cv-pdf__note"]}>Couldn't read the PDF. {error()}</p>}
      >
        <Show
          when={check()}
          fallback={<p class={styles["cv-pdf__note"]}>Printing the PDF to measure each page…</p>}
        >
          {(result) => (
            <>
              <DeskPageSheets pages={result().pages} />
              <Show
                when={warnings().length > 0}
                fallback={
                  <p class={styles["cv-pdf__note"]}>
                    Fits on {result().pages.length} {result().pages.length === 1 ? "page" : "pages"}
                    .
                  </p>
                }
              >
                <ul class={styles["cv-pdf__warnings"]} role="status">
                  <For each={warnings()}>{(warning) => <li>{warning}</li>}</For>
                </ul>
              </Show>
            </>
          )}
        </Show>
      </Show>

      <p class={styles["cv-pdf__note"]}>
        <a
          href={props.primary ? CV_PDF_PATH : deskCvPdfPath(props.cv)}
          class="text-link"
          target="_blank"
        >
          Open the PDF
        </a>
        {props.primary ? " (the public download)." : " (private, desk only)."}
      </p>
    </section>
  );
}
