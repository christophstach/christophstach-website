import type { BoardField, BoardForm } from "../../lib/desk/board-form";
import { ATS_PROVIDER_LABELS } from "../../data/postings";
import { Show } from "solid-js";
import { readBoardUrl } from "../../lib/ats-board";

interface DeskBoardFieldsProps {
  form: BoardForm;
  onInput: (field: BoardField, value: string) => void;
}

/**
 * The fields of a job board collector: the careers address it reads, the
 * company's name, and the filters on what reaches the inbox.
 */
export function DeskBoardFields(props: DeskBoardFieldsProps) {
  const found = () => readBoardUrl(props.form.address);

  const bind = (field: BoardField) => ({
    value: props.form[field],
    onInput: (event: InputEvent & { currentTarget: HTMLInputElement }) => {
      props.onInput(field, event.currentTarget.value);
    },
  });

  return (
    <>
      <label class="field field--wide">
        <span class="field__label">job board</span>
        <input
          {...bind("address")}
          class="input"
          type="url"
          required
          placeholder="https://jobs.lever.co/acme"
        />
        <Show
          when={found()}
          fallback={
            <span class="field__hint">
              The careers page on Greenhouse, Lever, Ashby or Personio, e.g.
              job-boards.greenhouse.io/acme, jobs.lever.co/acme, jobs.ashbyhq.com/acme or
              acme.jobs.personio.de. A link to one of its jobs works too.
            </span>
          }
        >
          {(board) => (
            <span class="field__hint">
              {ATS_PROVIDER_LABELS[board().provider]} board “{board().board}”.
            </span>
          )}
        </Show>
      </label>

      <label class="field">
        <span class="field__label">company</span>
        <input {...bind("company")} class="input" required placeholder="Acme" />
        <span class="field__hint">As its postings name it: companies match by name.</span>
      </label>

      <label class="field">
        <span class="field__label">locations</span>
        <input {...bind("locations")} class="input" placeholder="Berlin, Germany, Remote" />
        <span class="field__hint">A job's location has one of these; empty takes every place.</span>
      </label>

      <label class="field">
        <span class="field__label">titles with</span>
        <input {...bind("titleIncludes")} class="input" placeholder="engineer, developer" />
        <span class="field__hint">A title has one of these words; empty takes every title.</span>
      </label>

      <label class="field">
        <span class="field__label">titles without</span>
        <input {...bind("titleExcludes")} class="input" placeholder="intern, sales" />
        <span class="field__hint">A title with one of these is left out.</span>
      </label>
    </>
  );
}
