import {
  COVER_LETTER_LANGUAGES,
  COVER_LETTER_WORDING,
} from "../../../../data/cover-letter-wording";
import type { CoverLetter, CoverLetterLanguage } from "../../../../data/cover-letters";
import { For, Show, createMemo, createStore } from "solid-js";
import { rewordLetter, slugify } from "../../../../lib/cover-letter";
import { useNavigate, useSearchParams } from "@solidjs/router";
import { DeskMeta } from "../../../../components/desk/DeskMeta";
import { IconPlus } from "../../../../components/icons";
import type { RouteDefinition } from "@solidjs/router";
import { formatDay } from "../../../../lib/format";
import { getDeskCoverLetters } from "../../../../lib/desk/queries";
import { letterStatus } from "../../../../lib/cv-layout";
import { paths } from "../../../../router";
import { saveDeskLetter } from "../../../../lib/desk/letters";
import styles from "../../../../components/desk/page-cover-letters-index.module.css";
import { useDeskRequest } from "../../../../lib/desk/request";

interface CreateForm {
  id: string;
  company: string;
  jobTitle: string;
  language: CoverLetterLanguage;
}

/** A new letter with the default wording in English, reworded for the form's values. */
function blank(): CoverLetter {
  const { salutation, closing, subject } = COVER_LETTER_WORDING.en;

  return {
    id: "",
    label: "",
    note: "",
    variantId: "",
    company: "",
    recipient: "",
    jobTitle: "",
    jobUrl: "",
    jobDescription: "",
    language: "en",
    letterDate: "",
    subject: subject(""),
    salutation,
    body: "",
    closing,
  };
}

/** The form for a new letter, opened by "?new"; "?new&from=<id>" duplicates that letter. */
function CreateLetter(props: { source: CoverLetter | undefined }) {
  const navigate = useNavigate();
  const request = useDeskRequest();
  // Follows the letter to duplicate: its company, job title and language.
  const [form, setForm] = createStore<CreateForm>(
    () => ({
      id: "",
      company: props.source?.company ?? "",
      jobTitle: props.source?.jobTitle ?? "",
      language: props.source?.language ?? "en",
    }),
    { id: "", company: "", jobTitle: "", language: "en" },
  );
  const generatedId = () => slugify(`${form.company} ${form.jobTitle}`);

  const bind = (key: "id" | "company" | "jobTitle") => ({
    value: form[key],
    onInput: (event: InputEvent & { currentTarget: HTMLInputElement }) => {
      const { value } = event.currentTarget;

      setForm((draft) => {
        draft[key] = value;
      });
    },
  });

  async function create(event: SubmitEvent) {
    event.preventDefault();

    const id = form.id.trim() === "" ? generatedId() : form.id.trim();
    const start = props.source ?? blank();
    const letter: CoverLetter = {
      ...rewordLetter(start, form.language, form.jobTitle.trim()),
      id,
      label: [form.company.trim(), form.jobTitle.trim()].filter((part) => part !== "").join(", "),
      company: form.company,
      // A duplicate is for another application: only the text carries over.
      recipient:
        props.source !== undefined && form.company !== props.source.company ? "" : start.recipient,
      jobUrl: "",
      jobDescription: "",
      letterDate: new Date().toISOString().slice(0, 10),
    };

    if (await request.run(() => saveDeskLetter(letter, { create: true }))) {
      navigate(paths.desk["cover-letters"](id));
    }
  }

  return (
    <form class={styles.create} onSubmit={(event) => void create(event)}>
      <h2 class={styles.create__title}>
        {props.source === undefined ? "New letter" : `Duplicate ${props.source.label}`}
      </h2>

      <div class={styles.create__fields}>
        <label class="field">
          <span class="field__label">company</span>
          <input {...bind("company")} class="input" required placeholder="Acme" />
        </label>

        <label class="field">
          <span class="field__label">job title</span>
          <input {...bind("jobTitle")} class="input" placeholder="Senior Frontend Engineer" />
        </label>

        <label class="field">
          <span class="field__label">language</span>
          {/* `selected` on the options: see the variant select in /desk/cv. */}
          <select
            class="input"
            onChange={(event) => {
              const language = COVER_LETTER_LANGUAGES.find(
                (option) => option === event.currentTarget.value,
              );

              if (language !== undefined) {
                setForm((draft) => {
                  draft.language = language;
                });
              }
            }}
          >
            <For each={COVER_LETTER_LANGUAGES}>
              {(language) => (
                <option value={language} selected={language === form.language}>
                  {COVER_LETTER_WORDING[language].name}
                </option>
              )}
            </For>
          </select>
          <span class="field__hint">Sets the date format and the default wording.</span>
        </label>

        <label class="field">
          <span class="field__label">id</span>
          <input
            {...bind("id")}
            class="input"
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            placeholder={generatedId() === "" ? "acme-frontend" : generatedId()}
          />
          <span class="field__hint">The URL slug. Left empty, it is the one shown here.</span>
        </label>
      </div>

      <Show when={request.error()}>
        {(error) => (
          <p class={styles.create__error} role="alert">
            {error()}
          </p>
        )}
      </Show>

      <div class={styles.create__actions}>
        <button type="submit" class="button button--primary" disabled={request.busy()}>
          {request.busy() ? "Creating…" : "Create letter"}
        </button>
        <a href={paths.desk["cover-letters"]()} class="button button--outline">
          Cancel
        </a>
      </div>
    </form>
  );
}

export default function CoverLetters() {
  const [search] = useSearchParams();
  const letters = createMemo(() => getDeskCoverLetters());
  const creating = () => search.new !== undefined;
  const source = () => letters().find((letter) => letter.id === search.from);

  return (
    <div class="desk-page">
      <DeskMeta title="Cover letters · Desk" />
      <header class="desk-head">
        <div class="desk-head__text">
          <p class="desk-head__path">~/desk/cover-letters</p>
          <h1 class="desk-head__title">Cover letters</h1>
          <p class="desk-head__sub">One for each application. Private, only in the desk.</p>
        </div>

        <Show when={!creating()}>
          <a href={paths.desk["cover-letters"]({ new: "1" })} class="button button--primary">
            <IconPlus size={16} />
            New letter
          </a>
        </Show>
      </header>

      <Show when={creating()}>
        <CreateLetter source={source()} />
      </Show>

      <Show
        when={letters().length > 0}
        fallback={
          <Show when={!creating()}>
            <p class="panel panel__empty">No cover letters yet.</p>
          </Show>
        }
      >
        <section class="panel" aria-labelledby="panel-letters">
          <header class="panel__head">
            <h2 id="panel-letters" class="panel__title">
              applications
            </h2>
          </header>

          <ul class="panel__rows">
            <For each={letters()} keyed={(letter) => letter.id}>
              {(letter) => (
                <li>
                  <a href={paths.desk["cover-letters"](letter().id)} class="panel-row">
                    <span class="panel-row__label">{letter().label}</span>
                    <Show when={letter().note !== ""}>
                      <span class="desk-note">{letter().note}</span>
                    </Show>
                    <span class="panel-row__meta">
                      <span
                        class={`desk-status desk-status--${letterStatus(letter().pageFills).tone}`}
                      >
                        {letterStatus(letter().pageFills).text}
                      </span>
                      <Show when={letter().letterDate !== ""}>
                        <span>{formatDay(letter().letterDate, "en")}</span>
                      </Show>
                      <span>{COVER_LETTER_WORDING[letter().language].name}</span>
                    </span>
                  </a>
                </li>
              )}
            </For>
          </ul>
        </section>
      </Show>
    </div>
  );
}

export const route = {
  preload: () => {
    void getDeskCoverLetters();
  },
} satisfies RouteDefinition;
