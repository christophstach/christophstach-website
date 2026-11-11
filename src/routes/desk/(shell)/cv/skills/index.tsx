import { Show, createMemo, createStore } from "solid-js";
import { getDeskContent, getDeskVariants } from "../../../../../lib/desk/queries";
import { useNavigate, useSearchParams } from "@solidjs/router";
import { DeskMeta } from "../../../../../components/desk/DeskMeta";
import { DeskSaveBar } from "../../../../../components/desk/DeskSaveBar";
import { DeskTable } from "../../../../../components/desk/DeskTable";
import { IconPlus } from "../../../../../components/icons";
import type { RouteDefinition } from "@solidjs/router";
import type { SkillGroupRecord } from "../../../../../data/cv";
import { forgetPageChecks } from "../../../../../lib/desk/page-checks";
import { inOrder, setItems } from "../../../../../lib/desk/picks";
import { paths } from "../../../../../router";
import { saveDeskSkillGroups } from "../../../../../lib/desk/content";
import styles from "../../../../../components/desk/page-cv-skills.module.css";
import { useDeskRequest } from "../../../../../lib/desk/request";
import { useDraft } from "../../../../../lib/desk/draft";

const EMPTY_FORM = { label: "", name: "", title: "" };

/** The form for a new group, opened by "?new"; the group goes to the end of the list. */
function CreateGroup(props: { groups: SkillGroupRecord[] }) {
  const navigate = useNavigate();
  const request = useDeskRequest();
  const [form, setForm] = createStore({ ...EMPTY_FORM });

  const bind = (key: keyof typeof EMPTY_FORM) => ({
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

    const label = form.label.trim();
    const group = { label, name: form.name, note: "", title: form.title, items: [] };

    // The server refuses a list with a taken id.
    if (await request.run(() => saveDeskSkillGroups([...props.groups, group]))) {
      forgetPageChecks();
      setForm(() => ({ ...EMPTY_FORM }));
      navigate(paths.desk.cv.skills(label));
    }
  }

  return (
    <form class={styles.create} onSubmit={(event) => void create(event)}>
      <h2 class={styles.create__title}>New group</h2>

      <div class={styles.create__fields}>
        <label class="field">
          <span class="field__label">id</span>
          <input
            {...bind("label")}
            class="input"
            required
            pattern="[a-z0-9][a-z0-9_\-]*"
            placeholder="cloud"
          />
          <span class="field__hint">The home page shows it. Can't change later.</span>
        </label>
        <label class="field">
          <span class="field__label">name</span>
          <input {...bind("name")} class="input" required placeholder="Cloud" />
          <span class="field__hint">Only the desk shows it.</span>
        </label>
        <label class="field">
          <span class="field__label">title</span>
          <input {...bind("title")} class="input" required placeholder="Cloud & DevOps" />
          <span class="field__hint">The heading the CV prints.</span>
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
          {request.busy() ? "Creating…" : "Create group"}
        </button>
        <a href={paths.desk.cv.skills()} class="button button--outline">
          Cancel
        </a>
      </div>
    </form>
  );
}

export default function SkillsPage() {
  const [search] = useSearchParams();
  const content = createMemo(() => getDeskContent());
  const variants = createMemo(() => getDeskVariants());
  const creating = () => search.new !== undefined;
  // Only the order is edited here; each group's fields have their own page.
  const { form, setForm, dirty, reset } = useDraft<{ order: string[] }>(
    () => ({ order: content().skills.map((group) => group.label) }),
    { order: [] },
  );
  const request = useDeskRequest();
  const rows = () => inOrder(form.order, content().skills, (group) => group.label);

  /** Names of the variants that print this skill group. */
  const usedBy = (label: string) =>
    variants()
      .variants.filter((variant) => variant.skills.includes(label))
      .map((variant) => variant.label);

  async function save(event: SubmitEvent) {
    event.preventDefault();

    if (await request.run(() => saveDeskSkillGroups(rows()))) {
      forgetPageChecks();
    }
  }

  return (
    <div class="desk-page">
      <DeskMeta title="Skills · CV · Desk" />
      <header class="desk-head">
        <div class="desk-head__text">
          <p class="desk-head__path">
            <a href={paths.desk.cv()}>~/desk/cv</a> / skills
          </p>
          <h1 class="desk-head__title">Skills</h1>
          <p class="desk-head__sub">
            The home page shows every group in this order; variants pick which ones the PDF prints.
          </p>
        </div>

        <Show when={!creating()}>
          <a href={paths.desk.cv.skills({ new: "1" })} class="button button--primary">
            <IconPlus size={16} />
            New group
          </a>
        </Show>
      </header>

      <Show when={creating()}>
        {/* The list as shown, so a new group keeps an unsaved reorder instead of resetting it. */}
        <CreateGroup groups={rows()} />
      </Show>

      <Show when={request.error() !== "" && !dirty()}>
        <p class="desk-error" role="alert">
          {request.error()}
        </p>
      </Show>

      <Show
        when={content().skills.length > 0}
        fallback={<p class="panel panel__empty">No skill groups yet.</p>}
      >
        <form onSubmit={(event) => void save(event)}>
          <DeskTable
            title="groups"
            noun={["group", "groups"]}
            rows={rows()}
            rowKey={(group) => group.label}
            rowHref={(group) => paths.desk.cv.skills(group.label)()}
            reorder={{
              label: (group) => group.name,
              onReorder: (labels) => {
                setForm((draft) => {
                  setItems(draft.order, labels);
                });
              },
            }}
            columns={[
              {
                id: "group",
                header: "group",
                primary: true,
                cell: (group) => (
                  <span class={styles.group}>
                    <span class={styles.group__name}>{group.name}</span>
                    <Show when={group.title !== group.name}>
                      <span class={styles.group__title}>{group.title}</span>
                    </Show>
                    <Show when={group.note !== ""}>
                      <span class="desk-note">{group.note}</span>
                    </Show>
                  </span>
                ),
                sort: (group) => group.name,
                search: (group) =>
                  [group.label, group.name, group.title, group.note].concat(group.items).join(" "),
              },
              {
                id: "skills",
                header: "skills",
                align: "end",
                cell: (group) => group.items.length,
                sort: (group) => group.items.length,
                firstDirection: "desc",
              },
              {
                id: "variants",
                header: "printed by",
                cell: (group) =>
                  usedBy(group.label).length > 0 ? usedBy(group.label).join(", ") : "no variant",
                sort: (group) => usedBy(group.label).length,
                firstDirection: "desc",
              },
            ]}
            filters={[
              {
                id: "printed",
                label: "printed",
                options: [
                  { value: "yes", label: "by a variant" },
                  { value: "no", label: "by none" },
                ],
                value: (group) => (usedBy(group.label).length > 0 ? "yes" : "no"),
              },
            ]}
          />

          <Show when={dirty()}>
            <DeskSaveBar busy={request.busy()} error={request.error()} onDiscard={reset} />
          </Show>
        </form>
      </Show>
    </div>
  );
}

export const route = {
  preload: () => {
    void getDeskContent();
    void getDeskVariants();
  },
} satisfies RouteDefinition;
