import { IconCopy, IconTrash } from "../../../../components/icons";
import { Show, createMemo, createSignal, snapshot } from "solid-js";
import { deleteDeskLetter, saveDeskLetter } from "../../../../lib/desk/letters";
import { getDeskCoverLetters, getDeskProfile, getDeskVariants } from "../../../../lib/desk/queries";
import { useNavigate, useParams } from "@solidjs/router";
import { COVER_LETTER_MARGIN_MM } from "../../../../data/cover-letter-wording";
import type { CoverLetter } from "../../../../data/cover-letters";
import { CoverLetterDocument } from "../../../../components/CoverLetterDocument";
import { DeskCoverLetterPages } from "../../../../components/desk/DeskCoverLetterPages";
import { DeskLetterFields } from "../../../../components/desk/DeskLetterFields";
import { DeskMenu } from "../../../../components/desk/DeskMenu";
import { DeskMeta } from "../../../../components/desk/DeskMeta";
import { DeskSaveBar } from "../../../../components/desk/DeskSaveBar";
import type { RouteDefinition } from "@solidjs/router";
import { paths } from "../../../../router";
import { printedLetter } from "../../../../lib/cover-letter";
import styles from "../../../../components/desk/page-cover-letters-id.module.css";
import { useDeskRequest } from "../../../../lib/desk/request";
import { useDraft } from "../../../../lib/desk/draft";

/** The form's state: the letter without its page check. */
function toForm(letter: CoverLetter): CoverLetter {
  return {
    id: letter.id,
    label: letter.label,
    note: letter.note,
    variantId: letter.variantId,
    company: letter.company,
    recipient: letter.recipient,
    jobTitle: letter.jobTitle,
    jobUrl: letter.jobUrl,
    jobDescription: letter.jobDescription,
    language: letter.language,
    letterDate: letter.letterDate,
    subject: letter.subject,
    salutation: letter.salutation,
    body: letter.body,
    closing: letter.closing,
  };
}

const EMPTY_FORM: CoverLetter = toForm({
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
  subject: "",
  salutation: "",
  body: "",
  closing: "",
});

export default function CoverLetterEditor() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const letters = createMemo(() => getDeskCoverLetters());
  const variants = createMemo(() => getDeskVariants());
  const profile = createMemo(() => getDeskProfile());
  const [removing, setRemoving] = createSignal(false);
  // While deleting, the refetched list no longer has the letter: keep
  // showing the last one until the page has navigated away.
  const stored = createMemo((previous?: CoverLetter) => {
    const letter = letters().find((candidate) => candidate.id === params.id);

    if (letter !== undefined) {
      return letter;
    }

    if (removing() && previous !== undefined) {
      return previous;
    }

    throw Object.assign(new Error(`No cover letter "${params.id}".`), { status: 404 });
  });
  const { form, setForm, saved, dirty, reset, leave } = useDraft(
    () => toForm(stored()),
    EMPTY_FORM,
  );
  const request = useDeskRequest();
  // Bumped after every save, so the page check runs again.
  const [revision, setRevision] = createSignal(0);
  const linkedRole = () =>
    variants().variants.find((variant) => variant.id === form.variantId)?.role;
  // The sheet in the rail shows the draft, before it is saved.
  const preview = () => printedLetter(form, profile(), linkedRole());

  async function save(event: SubmitEvent) {
    event.preventDefault();

    if (await request.run(() => saveDeskLetter(snapshot(form), { create: false }))) {
      setRevision((value) => value + 1);
    }
  }

  async function remove() {
    // oxlint-disable-next-line no-alert -- a desk-only safety net before deleting
    if (!confirm(`Delete the cover letter "${saved().label}"?`)) {
      return;
    }

    setRemoving(true);

    if (await request.run(() => deleteDeskLetter(params.id))) {
      leave();
      navigate(paths.desk["cover-letters"]());
    } else {
      setRemoving(false);
    }
  }

  return (
    <div class="desk-page editor">
      <DeskMeta
        title={`${saved().label === "" ? params.id : saved().label} · Cover letters · Desk`}
      />
      <header class="desk-head">
        <div class="desk-head__text">
          <p class="desk-head__path">
            <a href={paths.desk["cover-letters"]()}>~/desk/cover-letters</a> / {params.id}
          </p>
          <h1 class="desk-head__title">{form.label === "" ? params.id : form.label}</h1>
          <p class="desk-head__sub">Private, only in the desk.</p>
        </div>

        <DeskMenu
          label="Letter actions"
          actions={[
            {
              label: "Duplicate",
              icon: IconCopy,
              run: () => {
                navigate(paths.desk["cover-letters"]({ new: "1", from: params.id }));
              },
            },
            { label: "Delete", icon: IconTrash, run: () => void remove(), danger: true },
          ]}
        />
      </header>

      <Show when={request.error() !== "" && !dirty()}>
        <p class="desk-error" role="alert">
          {request.error()}
        </p>
      </Show>

      <form class={styles.editor__body} onSubmit={(event) => void save(event)}>
        <DeskLetterFields form={form} setForm={setForm} variants={variants().variants} />

        <aside class={styles.editor__rail}>
          <DeskCoverLetterPages id={params.id} revision={revision()} />

          <section class={styles.preview} aria-labelledby="letter-preview-title">
            <h2 id="letter-preview-title" class={styles.preview__title}>
              Preview
            </h2>
            <div class={styles.preview__frame}>
              <div class={styles.preview__sheet} style={{ padding: `${COVER_LETTER_MARGIN_MM}mm` }}>
                <CoverLetterDocument letter={preview()} />
              </div>
            </div>
          </section>
        </aside>

        <Show when={dirty()}>
          <DeskSaveBar busy={request.busy()} error={request.error()} onDiscard={reset} />
        </Show>
      </form>
    </div>
  );
}

export const route = {
  preload: () => {
    void getDeskCoverLetters();
    void getDeskVariants();
    void getDeskProfile();
  },
} satisfies RouteDefinition;
