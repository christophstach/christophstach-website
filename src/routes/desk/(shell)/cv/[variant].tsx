import { DEFAULT_CV_LAYOUT, sameLayout } from "../../../../data/cv-print-layout";
import { IconCopy, IconFileDownload, IconTrash, IconWorld } from "../../../../components/icons";
import { Show, createMemo, createSignal, snapshot } from "solid-js";
import { deleteDeskVariant, markDeskVariant, saveDeskVariant } from "../../../../lib/desk/variants";
import { getDeskContent, getDeskProjects, getDeskVariants } from "../../../../lib/desk/queries";
import { useNavigate, useParams } from "@solidjs/router";
import type { CvLayout } from "../../../../data/cv-print-layout";
import { DeskCvLayout } from "../../../../components/desk/DeskCvLayout";
import { DeskCvPdf } from "../../../../components/desk/DeskCvPdf";
import { DeskMenu } from "../../../../components/desk/DeskMenu";
import { DeskMeta } from "../../../../components/desk/DeskMeta";
import { DeskSaveBar } from "../../../../components/desk/DeskSaveBar";
import type { DeskVariant } from "../../../../lib/desk/queries";
import { DeskVariantPicks } from "../../../../components/desk/DeskVariantPicks";
import type { MenuAction } from "../../../../components/desk/DeskMenu";
import type { RouteDefinition } from "@solidjs/router";
import type { SetForm } from "../../../../components/desk/DeskVariantPicks";
import type { VariantInput } from "../../../../lib/desk/variants";
import { paths } from "../../../../router";
import styles from "../../../../components/desk/page-cv-variant.module.css";
import { useDeskRequest } from "../../../../lib/desk/request";
import { useDraft } from "../../../../lib/desk/draft";
import { variantContent } from "../../../../lib/desk-variant";

/** The editable part of a variant: its content without the id. */
function toForm(variant: DeskVariant): VariantInput {
  const { id: _id, ...content } = variantContent(variant);

  return content;
}

const EMPTY_FORM: VariantInput = {
  label: "",
  note: "",
  role: "",
  summary: "",
  coreTechnologies: [],
  experience: [],
  education: [],
  projects: [],
  skills: [],
  layout: { ...DEFAULT_CV_LAYOUT },
};

interface VariantRailProps {
  id: string;
  primary: boolean;
  revision: number;
  trial: CvLayout | undefined;
  form: VariantInput;
  setForm: SetForm;
  saved: VariantInput;
  onCheck: () => void;
}

/** The editor's side column: the page check, the layout steps, the desk name and note. */
function VariantRail(props: VariantRailProps) {
  const bind = (key: "label" | "note") => ({
    value: props.form[key],
    onInput: (event: InputEvent & { currentTarget: HTMLInputElement | HTMLTextAreaElement }) => {
      const { value } = event.currentTarget;

      props.setForm((draft) => {
        draft[key] = value;
      });
    },
  });

  return (
    <aside class={styles.editor__rail}>
      <DeskCvPdf
        variant={props.id}
        primary={props.primary}
        revision={props.revision}
        trial={props.trial}
      />
      <DeskCvLayout
        layout={props.form.layout}
        saved={props.saved.layout}
        checked={props.trial ?? props.saved.layout}
        onChange={(layout) => {
          // Leaf writes, so only readers of the changed step re-run.
          props.setForm((draft) => {
            Object.assign(draft.layout, layout);
          });
        }}
        onCheck={props.onCheck}
      />
      <label class="field">
        <span class="field__label">name in the desk</span>
        <input {...bind("label")} class="input" required />
      </label>
      <label class="field">
        <span class="field__label">note</span>
        <textarea
          {...bind("note")}
          class="input"
          rows="2"
          placeholder="What this variant is for, e.g. which jobs."
        />
        <span class="field__hint">Only the desk shows the name and the note.</span>
      </label>
    </aside>
  );
}

export default function VariantEditor() {
  const params = useParams<{ variant: string }>();
  const navigate = useNavigate();
  const data = createMemo(() => getDeskVariants());
  const [removing, setRemoving] = createSignal(false);
  // While deleting, the refetched list no longer has the variant: keep
  // showing the last one until the page has navigated away.
  const stored = createMemo((previous?: DeskVariant) => {
    const variant = data().variants.find((candidate) => candidate.id === params.variant);

    if (variant !== undefined) {
      return variant;
    }

    if (removing() && previous !== undefined) {
      return previous;
    }

    throw Object.assign(new Error(`No CV variant "${params.variant}".`), { status: 404 });
  });
  const { form, setForm, saved, dirty, reset, leave } = useDraft(
    () => toForm(stored()),
    EMPTY_FORM,
  );
  const request = useDeskRequest();
  const isPrimary = () => data().primaryId === params.variant;
  const isWebsite = () => data().websiteId === params.variant;
  // Bumped after every save, so the page check runs again.
  const [revision, setRevision] = createSignal(0);
  // Steps the page check prints before they are saved; undefined checks the stored ones.
  const [trial, setTrial] = createSignal<CvLayout | undefined>();

  const purpose = () => {
    if (isPrimary()) {
      return "The CV visitors download.";
    }

    return isWebsite() ? "Feeds the curriculum page." : "Private, only in the desk.";
  };

  async function save(event: SubmitEvent) {
    event.preventDefault();

    if (
      await request.run(() => saveDeskVariant(params.variant, snapshot(form), { create: false }))
    ) {
      setTrial(undefined);
      setRevision((value) => value + 1);
    }
  }

  async function remove() {
    if (!confirm(`Delete the variant "${saved().label}"?`)) {
      return;
    }

    setRemoving(true);

    if (await request.run(() => deleteDeskVariant(params.variant))) {
      leave();
      navigate(paths.desk.cv());
    } else {
      setRemoving(false);
    }
  }

  const actions = (): MenuAction[] => [
    ...(isPrimary()
      ? []
      : [
          {
            label: "Make primary (PDF)",
            icon: IconFileDownload,
            run: () => void request.run(() => markDeskVariant(params.variant, "primary")),
          },
        ]),
    ...(isWebsite()
      ? []
      : [
          {
            label: "Use on website",
            icon: IconWorld,
            run: () => void request.run(() => markDeskVariant(params.variant, "website")),
          },
        ]),
    {
      label: "Duplicate",
      icon: IconCopy,
      run: () => {
        navigate(paths.desk.cv({ new: "1", from: params.variant }));
      },
    },
    ...(isPrimary() || isWebsite()
      ? []
      : [{ label: "Delete", icon: IconTrash, run: () => void remove(), danger: true }]),
  ];

  return (
    <div class="desk-page editor">
      <DeskMeta title={`${saved().label === "" ? params.variant : saved().label} · CV · Desk`} />
      <header class="desk-head">
        <div class="desk-head__text">
          <p class="desk-head__path">
            <a href={paths.desk.cv()}>~/desk/cv</a> / {params.variant}
          </p>
          <h1 class="desk-head__title">{form.label === "" ? params.variant : form.label}</h1>
          <p class={["desk-head__sub", styles.editor__role]}>
            <Show when={isPrimary()}>
              <span class="role-tag">PDF</span>
            </Show>
            <Show when={isWebsite()}>
              <span class="role-tag">/curriculum</span>
            </Show>
            <span>{purpose()}</span>
          </p>
          <Show when={form.note !== ""}>
            <p class={["desk-note", styles.editor__note]}>{form.note}</p>
          </Show>
        </div>

        <DeskMenu actions={actions()} label="Variant actions" />
      </header>

      <Show when={request.error() !== "" && !dirty()}>
        <p class="desk-error" role="alert">
          {request.error()}
        </p>
      </Show>

      <form class={styles.editor__body} onSubmit={(event) => void save(event)}>
        <DeskVariantPicks form={form} setForm={setForm} />

        <VariantRail
          id={params.variant}
          primary={isPrimary()}
          revision={revision()}
          trial={trial()}
          form={form}
          setForm={setForm}
          saved={saved()}
          onCheck={() => {
            setTrial(sameLayout(form.layout, saved().layout) ? undefined : { ...form.layout });
          }}
        />

        <Show when={dirty()}>
          <DeskSaveBar
            busy={request.busy()}
            error={request.error()}
            onDiscard={() => {
              reset();
              setTrial(undefined);
            }}
          />
        </Show>
      </form>
    </div>
  );
}

export const route = {
  preload: () => {
    void getDeskVariants();
    void getDeskContent();
    void getDeskProjects();
  },
} satisfies RouteDefinition;
