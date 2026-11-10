import { COVER_LETTER_LANGUAGES, COVER_LETTER_WORDING } from "../../data/cover-letter-wording";
import { For, Show } from "solid-js";
import type { CoverLetter } from "../../data/cover-letters";
import { DeskFormSection } from "./DeskFormSection";
import type { DeskVariant } from "../../lib/desk/queries";
import { deskVariantPdfPath } from "../../data/endpoints";
import { rewordLetter } from "../../lib/cover-letter";

type TextKey = Exclude<keyof CoverLetter, "id" | "language">;
type SetForm = (write: (draft: CoverLetter) => void) => void;

interface DeskLetterFieldsProps {
  form: CoverLetter;
  setForm: SetForm;
  variants: DeskVariant[];
}

type FieldElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

/** The letter editor's fields: the desk-only ones, the job, the letter itself. */
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
  const linked = () => props.variants.find((variant) => variant.id === props.form.variantId);

  /** A new language or job title rewords only the text that is still the default. */
  function reword(language: CoverLetter["language"], jobTitle: string) {
    const next = rewordLetter(props.form, language, jobTitle);

    props.setForm((draft) => {
      draft.language = next.language;
      draft.jobTitle = next.jobTitle;
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
          <span class="field__label">cv variant</span>
          <select
            class="input"
            value={props.form.variantId}
            onChange={(event) => {
              const { value } = event.currentTarget;

              props.setForm((draft) => {
                draft.variantId = value;
              });
            }}
          >
            <option value="">None</option>
            <For each={props.variants}>
              {(variant) => <option value={variant.id}>{variant.label}</option>}
            </For>
          </select>
          <span class="field__hint">
            The CV you send with it; its role prints under your name.{" "}
            <Show when={linked()}>
              {(variant) => (
                <a href={deskVariantPdfPath(variant().id)} class="text-link" target="_blank">
                  Open the CV
                </a>
              )}
            </Show>
          </span>
        </label>
        <label class="field field--wide">
          <span class="field__label">note</span>
          <textarea
            {...bind("note")}
            class="input"
            rows="2"
            placeholder="Where you applied, who you spoke to."
          />
        </label>
      </DeskFormSection>

      <DeskFormSection title="job" description="Only the company prints.">
        <label class="field">
          <span class="field__label">company</span>
          <input {...bind("company")} class="input" required />
        </label>
        <label class="field">
          <span class="field__label">job title</span>
          <input
            value={props.form.jobTitle}
            class="input"
            onInput={(event) => {
              reword(props.form.language, event.currentTarget.value);
            }}
          />
        </label>
        <label class="field field--wide">
          <span class="field__label">url</span>
          <input {...bind("jobUrl")} class="input" type="url" placeholder="https://…" />
        </label>
        <label class="field field--wide">
          <span class="field__label">description</span>
          <textarea
            {...bind("jobDescription")}
            class="input"
            rows="4"
            placeholder="The ad, kept here to write against, also after it goes offline."
          />
        </label>
      </DeskFormSection>

      <DeskFormSection title="letter" description="A blank line starts a new paragraph.">
        <label class="field">
          <span class="field__label">language</span>
          <select
            class="input"
            value={props.form.language}
            onChange={(event) => {
              const language = COVER_LETTER_LANGUAGES.find(
                (option) => option === event.currentTarget.value,
              );

              if (language !== undefined) {
                reword(language, props.form.jobTitle);
              }
            }}
          >
            <For each={COVER_LETTER_LANGUAGES}>
              {(language) => (
                <option value={language}>{COVER_LETTER_WORDING[language].name}</option>
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
            placeholder="A person or an address, under the company."
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
