import { Bullets, EMPTY_ENTRY_FORM, Links, bind, toForm } from "./DeskEntryParts";
import { Show, createMemo, createSignal, snapshot } from "solid-js";
import { deleteDeskEntry, saveDeskEntry } from "../../lib/desk/content";
import { getDeskContent, getDeskCvs } from "../../lib/desk/queries";
import { DeskFormSection } from "./DeskFormSection";
import { DeskMenu } from "./DeskMenu";
import { DeskMeta } from "./DeskMeta";
import { DeskSaveBar } from "./DeskSaveBar";
import type { EntryRecord } from "../../data/cv";
import { IconTrash } from "../icons";
import type { Section } from "./DeskEntryParts";
import { forgetPageChecks } from "../../lib/desk/page-checks";
import { paths } from "../../router";
import styles from "./DeskEntryEditor.module.css";
import { useDeskRequest } from "../../lib/desk/request";
import { useDraft } from "../../lib/desk/draft";
import { useNavigate } from "@solidjs/router";

/** An error the error page shows with its status, e.g. an unknown id. */
function notFound(message: string): Error {
  return Object.assign(new Error(message), { status: 404 });
}

/** Edits one timeline entry: its fields, bullets and links. */
export function DeskEntryEditor(props: { section: Section; id: string }) {
  const navigate = useNavigate();
  const content = createMemo(() => getDeskContent());
  const cvs = createMemo(() => getDeskCvs());
  const [removing, setRemoving] = createSignal(false);
  // While deleting, the refetched content no longer has the entry: keep
  // showing the last one until the page has navigated away.
  const stored = createMemo((previous?: EntryRecord) => {
    const entry = content().entries.find(
      (candidate) => candidate.id === props.id && candidate.section === props.section,
    );

    if (entry !== undefined) {
      return entry;
    }

    if (removing() && previous !== undefined) {
      return previous;
    }

    throw notFound(`No ${props.section} entry "${props.id}".`);
  });
  const { form, setForm, saved, dirty, reset, leave } = useDraft(
    () => toForm(stored()),
    EMPTY_ENTRY_FORM,
  );
  const request = useDeskRequest();

  /** Names of the CVs that print a bullet (or, without one, the entry). */
  const usedBy = (bulletId?: string) =>
    cvs()
      .cvs.filter((cv) =>
        cv[props.section].some(
          (pick) =>
            pick.id === props.id && (bulletId === undefined || pick.bullets.includes(bulletId)),
        ),
      )
      .map((cv) => cv.label);

  async function save(event: SubmitEvent) {
    event.preventDefault();

    const draft = snapshot(form);
    const entry = { ...draft, id: props.id, section: props.section, tech: draft.tech.split(",") };

    if (await request.run(() => saveDeskEntry(entry, { create: false }))) {
      forgetPageChecks();
    }
  }

  async function remove() {
    const users = usedBy();
    const note = users.length > 0 ? ` ${users.join(", ")} print it and will drop it.` : "";
    const label = saved().name === "" ? saved().title : saved().name;

    if (!confirm(`Delete "${label}"?${note}`)) {
      return;
    }

    setRemoving(true);

    if (await request.run(() => deleteDeskEntry(props.id))) {
      forgetPageChecks();
      leave();
      navigate(paths.desk.content[props.section]());
    } else {
      setRemoving(false);
    }
  }

  const heading = () => [form.name, form.title, props.id].find((text) => text !== "") ?? props.id;

  return (
    <form class="desk-page" onSubmit={(event) => void save(event)}>
      <DeskMeta title={`${heading()} · CV · Desk`} />
      <header class="desk-head">
        <div class="desk-head__text">
          <p class="desk-head__path">
            <a href={paths.desk.content()}>~/desk/content</a> /{" "}
            <a href={paths.desk.content[props.section]()}>{props.section}</a> / {props.id}
          </p>
          <h1 class="desk-head__title">{heading()}</h1>
          <p class="desk-head__sub">
            {form.title} at {form.organization}{" "}
            <span class={styles.entry__used}>
              {usedBy().length > 0 ? `in ${usedBy().join(", ")}` : "in no CV"}
            </span>
          </p>
        </div>

        <DeskMenu
          label="Entry actions"
          actions={[{ label: "Delete", icon: IconTrash, run: () => void remove(), danger: true }]}
        />
      </header>

      <Show when={request.error() !== "" && !dirty()}>
        <p class="desk-error" role="alert">
          {request.error()}
        </p>
      </Show>

      <div class="panels">
        <DeskFormSection
          title="in the desk"
          description="Only you see these, never the CV or the site."
        >
          <label class="field">
            <span class="field__label">name</span>
            <input {...bind(form, setForm, "name")} class="input" required />
          </label>
          <label class="field field--wide">
            <span class="field__label">note</span>
            <textarea
              {...bind(form, setForm, "note")}
              class="input"
              rows="2"
              placeholder="What this entry is for, e.g. which jobs it fits."
            />
          </label>
        </DeskFormSection>

        <DeskFormSection title="basics" description="What you did, and where.">
          <label class="field field--wide">
            <span class="field__label">title</span>
            <input {...bind(form, setForm, "title")} class="input" required />
          </label>
          <label class="field">
            <span class="field__label">organization</span>
            <input {...bind(form, setForm, "organization")} class="input" required />
          </label>
          <label class="field">
            <span class="field__label">location</span>
            <input {...bind(form, setForm, "location")} class="input" placeholder="Berlin" />
          </label>
        </DeskFormSection>

        <DeskFormSection title="period" description="An empty end means it is ongoing.">
          <label class="field">
            <span class="field__label">from</span>
            <input {...bind(form, setForm, "from")} class="input" type="month" required />
          </label>
          <label class="field">
            <span class="field__label">to</span>
            <input {...bind(form, setForm, "to")} class="input" type="month" />
          </label>
        </DeskFormSection>

        <DeskFormSection title="tech" description="Shown as chips under the entry." single>
          <label class="field">
            <span class="field__label">technologies</span>
            <textarea
              {...bind(form, setForm, "tech")}
              class="input"
              rows="1"
              placeholder="TypeScript, Vue, Nuxt"
            />
            <span class="field__hint">Comma-separated, in display order.</span>
          </label>
        </DeskFormSection>

        <Bullets form={form} setForm={setForm} usedBy={usedBy} />
        <Links form={form} setForm={setForm} />
      </div>

      <Show when={dirty()}>
        <DeskSaveBar busy={request.busy()} error={request.error()} onDiscard={reset} />
      </Show>
    </form>
  );
}
