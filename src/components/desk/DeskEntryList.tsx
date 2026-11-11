import { Show, createMemo, createStore } from "solid-js";
import { getDeskContent, getDeskCvs } from "../../lib/desk/queries";
import { useNavigate, useSearchParams } from "@solidjs/router";
import type { EntryRecord } from "../../data/cv";
import { DeskTable } from "./DeskTable";
import { IconPlus } from "../icons";
import { forgetPageChecks } from "../../lib/desk/page-checks";
import { formatMonth } from "../../lib/format";
import { paths } from "../../router";
import { saveDeskEntry } from "../../lib/desk/content";
import styles from "./DeskEntryList.module.css";
import { useDeskRequest } from "../../lib/desk/request";

type Section = EntryRecord["section"];

const EMPTY_FORM = { id: "", name: "", title: "", organization: "", from: "" };

function period(entry: EntryRecord): string {
  return `${formatMonth(entry.from)} – ${entry.to === "" ? "now" : formatMonth(entry.to)}`;
}

/** The form for a new entry, opened by "?new". */
function CreateEntry(props: { section: Section }) {
  const navigate = useNavigate();
  const request = useDeskRequest();
  const [form, setForm] = createStore({ ...EMPTY_FORM });
  const sectionPath = () => paths.desk.content[props.section]();

  async function create(event: SubmitEvent) {
    event.preventDefault();

    const id = form.id.trim();
    const entry: EntryRecord = {
      id,
      section: props.section,
      name: form.name,
      note: "",
      title: form.title,
      organization: form.organization,
      location: "",
      from: form.from,
      to: "",
      tech: [],
      bullets: [],
      links: [],
    };

    if (await request.run(() => saveDeskEntry(entry, { create: true }))) {
      forgetPageChecks();
      setForm(() => ({ ...EMPTY_FORM }));
      navigate(paths.desk.content[props.section](id));
    }
  }

  const field = (key: keyof typeof EMPTY_FORM) => ({
    value: form[key],
    onInput: (event: InputEvent & { currentTarget: HTMLInputElement }) => {
      const { value } = event.currentTarget;

      setForm((draft) => {
        draft[key] = value;
      });
    },
  });

  return (
    <form class={styles.create} onSubmit={(event) => void create(event)}>
      <h2 class={styles.create__title}>New entry</h2>

      <div class={styles.create__fields}>
        <label class="field">
          <span class="field__label">id</span>
          <input
            {...field("id")}
            class="input"
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            placeholder="acme"
          />
          <span class="field__hint">
            Lowercase letters, digits and hyphens. Can't change later.
          </span>
        </label>
        <label class="field">
          <span class="field__label">name</span>
          <input {...field("name")} class="input" required placeholder="Acme, platform team" />
          <span class="field__hint">Only the desk shows it.</span>
        </label>
        <label class="field">
          <span class="field__label">title</span>
          <input {...field("title")} class="input" required />
        </label>
        <label class="field">
          <span class="field__label">organization</span>
          <input {...field("organization")} class="input" required />
        </label>
        <label class="field">
          <span class="field__label">from</span>
          <input {...field("from")} class="input" type="month" required />
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
          {request.busy() ? "Creating…" : "Create entry"}
        </button>
        <a href={sectionPath()} class="button button--outline">
          Cancel
        </a>
      </div>
    </form>
  );
}

/** The entries of one section, as cards, with "New entry". */
export function DeskEntryList(props: { section: Section }) {
  const [search] = useSearchParams();
  const content = createMemo(() => getDeskContent());
  const cvs = createMemo(() => getDeskCvs());
  const entries = () => content().entries.filter((entry) => entry.section === props.section);
  const heading = () => (props.section === "experience" ? "Experience" : "Education");
  const creating = () => search.new !== undefined;

  /** How many CVs pick this entry. */
  const usedBy = (id: string) =>
    cvs().cvs.filter((cv) => cv[props.section].some((pick) => pick.id === id)).length;

  return (
    <div class="desk-page">
      <header class="desk-head">
        <div class="desk-head__text">
          <p class="desk-head__path">
            <a href={paths.desk.content()}>~/desk/content</a> / {props.section}
          </p>
          <h1 class="desk-head__title">{heading()}</h1>
          <p class="desk-head__sub">
            The entries and bullets CVs pick from. A change here reaches every CV that uses it.
          </p>
        </div>

        <Show when={!creating()}>
          <a href={paths.desk.content[props.section]({ new: "1" })} class="button button--primary">
            <IconPlus size={16} />
            New entry
          </a>
        </Show>
      </header>

      <Show when={creating()}>
        <CreateEntry section={props.section} />
      </Show>

      <Show
        when={entries().length > 0}
        fallback={<p class="panel panel__empty">No entries yet.</p>}
      >
        <DeskTable
          title="entries"
          noun={["entry", "entries"]}
          rows={entries()}
          rowKey={(entry) => entry.id}
          rowHref={(entry) => paths.desk.content[props.section](entry.id)()}
          columns={[
            {
              id: "entry",
              header: "entry",
              primary: true,
              cell: (entry) => (
                <span class={styles.entry}>
                  <span class={styles.entry__label}>
                    {entry.name === "" ? entry.title : entry.name}
                  </span>
                  <span class={styles.entry__org}>
                    {entry.title} at {entry.organization}
                    {entry.location === "" ? "" : `, ${entry.location}`}
                  </span>
                  <Show when={entry.note !== ""}>
                    <span class="desk-note">{entry.note}</span>
                  </Show>
                </span>
              ),
              sort: (entry) => (entry.name === "" ? entry.title : entry.name),
              search: (entry) =>
                [entry.name, entry.title, entry.organization, entry.location, entry.note]
                  .concat(entry.tech)
                  .join(" "),
            },
            {
              id: "period",
              header: "period",
              cell: period,
              sort: (entry) => entry.from,
              firstDirection: "desc",
            },
            {
              id: "bullets",
              header: "bullets",
              align: "end",
              cell: (entry) => entry.bullets.length,
              sort: (entry) => entry.bullets.length,
              firstDirection: "desc",
            },
            {
              id: "cvs",
              header: "cvs",
              align: "end",
              cell: (entry) => usedBy(entry.id),
              sort: (entry) => usedBy(entry.id),
              firstDirection: "desc",
            },
          ]}
          filters={[
            {
              id: "used",
              label: "picked",
              options: [
                { value: "yes", label: "by a CV" },
                { value: "no", label: "by none" },
              ],
              value: (entry) => (usedBy(entry.id) > 0 ? "yes" : "no"),
            },
          ]}
        />
      </Show>
    </div>
  );
}
