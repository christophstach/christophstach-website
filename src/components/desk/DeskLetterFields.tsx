import { COVER_LETTER_LANGUAGES, COVER_LETTER_WORDING } from "../../data/cover-letter-wording";
import { For, Show } from "solid-js";
import type { ApplicationRecord } from "../../data/applications";
import type { CoverLetter } from "../../data/cover-letters";
import { DeskFormSection } from "./DeskFormSection";
import { applicationName } from "../../lib/application";
import { paths } from "../../router";
import { rewordLetter } from "../../lib/cover-letter";

type TextKey = Exclude<keyof CoverLetter, "id" | "language" | "applicationId">;
type SetForm = (write: (draft: CoverLetter) => void) => void;

interface DeskLetterFieldsProps {
  form: CoverLetter;
  setForm: SetForm;
  applications: ApplicationRecord[];
}

type FieldElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

/** The letter editor's fields: the desk-only ones, then the letter itself. */
export function DeskLetterFields(props: DeskLetterFieldsProps) {
  const bind = (key: TextKey) => ({
    value: props.form[key],
    onInput: (event: InputEvent & { currentTarget: FieldElement }) => {
      const { value } = event.currentTarget;

      props.setForm((draft) => {
        draft[key] = value;
      });
    },
  });
  const linked = () =>
    props.applications.find((application) => application.id === props.form.applicationId);
  // An application has at most one letter: its own, or one without a letter.
  const choices = () =>
    props.applications.filter(
      (application) => application.letter === null || application.letter.id === props.form.id,
    );
  const jobTitle = (applicationId: string) =>
    props.applications.find((application) => application.id === applicationId)?.jobTitle ?? "";

  /** A new language or application rewords only the text that is still the default. */
  function reword(language: CoverLetter["language"], applicationId: string) {
    const next = rewordLetter(props.form, {
      language,
      jobTitle: jobTitle(applicationId),
      previousJobTitle: jobTitle(props.form.applicationId),
    });

    props.setForm((draft) => {
      draft.applicationId = applicationId;
      draft.language = next.language;
      draft.subject = next.subject;
      draft.salutation = next.salutation;
      draft.closing = next.closing;
    });
  }

  return (
    <div class="panels">
      <DeskFormSection title="in the desk" description="Only you see these, never the letter.">
        <label class="field">
          <span class="field__label">name</span>
          <input {...bind("label")} class="input" required />
        </label>
        <label class="field">
          <span class="field__label">application</span>
          {/* `selected` on the options: see the CV select in /desk/cvs. */}
          <select
            class="input"
            onChange={(event) => {
              reword(props.form.language, event.currentTarget.value);
            }}
          >
            <For each={choices()}>
              {(application) => (
                <option
                  value={application.id}
                  selected={application.id === props.form.applicationId}
                >
                  {applicationName(application)}
                </option>
              )}
            </For>
          </select>
          <span class="field__hint">
            Its job and its CV, whose role prints under your name.{" "}
            <Show when={linked()}>
              {(application) => (
                <a href={paths.desk.applications(application().id)} class="text-link">
                  Open the application
                </a>
              )}
            </Show>
          </span>
        </label>
        <label class="field field--wide">
          <span class="field__label">note</span>
          <textarea {...bind("note")} class="input" rows="2" />
        </label>
      </DeskFormSection>

      <DeskFormSection title="letter" description="A blank line starts a new paragraph.">
        <label class="field">
          <span class="field__label">language</span>
          <select
            class="input"
            onChange={(event) => {
              const language = COVER_LETTER_LANGUAGES.find(
                (option) => option === event.currentTarget.value,
              );

              if (language !== undefined) {
                reword(language, props.form.applicationId);
              }
            }}
          >
            <For each={COVER_LETTER_LANGUAGES}>
              {(language) => (
                <option value={language} selected={language === props.form.language}>
                  {COVER_LETTER_WORDING[language].name}
                </option>
              )}
            </For>
          </select>
        </label>
        <label class="field">
          <span class="field__label">date</span>
          <input {...bind("letterDate")} class="input" type="date" />
        </label>
        <label class="field field--wide">
          <span class="field__label">recipient</span>
          <textarea
            {...bind("recipient")}
            class="input"
            rows="2"
            placeholder="Optional: a person or an address, above the date."
          />
        </label>
        <label class="field field--wide">
          <span class="field__label">subject</span>
          <input {...bind("subject")} class="input" />
        </label>
        <label class="field field--wide">
          <span class="field__label">salutation</span>
          <input {...bind("salutation")} class="input" />
        </label>
        <label class="field field--wide">
          <span class="field__label">text</span>
          <textarea {...bind("body")} class="input" rows="14" />
        </label>
        <label class="field field--wide">
          <span class="field__label">closing</span>
          <input {...bind("closing")} class="input" />
        </label>
      </DeskFormSection>
    </div>
  );
}
