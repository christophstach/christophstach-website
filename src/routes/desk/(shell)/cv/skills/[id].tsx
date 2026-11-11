import { For, Show, createMemo, createSignal, snapshot } from "solid-js";
import { getDeskContent, getDeskVariants } from "../../../../../lib/desk/queries";
import { useNavigate, useParams } from "@solidjs/router";
import { DeskFormSection } from "../../../../../components/desk/DeskFormSection";
import { DeskMenu } from "../../../../../components/desk/DeskMenu";
import { DeskMeta } from "../../../../../components/desk/DeskMeta";
import { DeskSaveBar } from "../../../../../components/desk/DeskSaveBar";
import { IconTrash } from "../../../../../components/icons";
import type { RouteDefinition } from "@solidjs/router";
import type { SkillGroupRecord } from "../../../../../data/cv";
import { forgetPageChecks } from "../../../../../lib/desk/page-checks";
import { paths } from "../../../../../router";
import { saveDeskSkillGroups } from "../../../../../lib/desk/content";
import styles from "../../../../../components/desk/page-cv-skills-id.module.css";
import { useDeskRequest } from "../../../../../lib/desk/request";
import { useDraft } from "../../../../../lib/desk/draft";

/** The form's state: the skills as one comma-separated line. */
function toForm(group: SkillGroupRecord) {
  return { name: group.name, note: group.note, title: group.title, items: group.items.join(", ") };
}

type GroupForm = ReturnType<typeof toForm>;

const EMPTY_FORM: GroupForm = { name: "", note: "", title: "", items: "" };

/**
 * One skill group's fields. The groups are saved as one list (that is how
 * their order is kept), so a save or delete here writes the whole list with
 * this group changed or left out.
 */
export default function SkillGroupEditor() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const content = createMemo(() => getDeskContent());
  const variants = createMemo(() => getDeskVariants());
  const [removing, setRemoving] = createSignal(false);
  // While deleting, the refetched list no longer has the group: keep showing
  // the last one until the page has navigated away.
  const stored = createMemo((previous?: SkillGroupRecord) => {
    const group = content().skills.find((candidate) => candidate.label === params.id);

    if (group !== undefined) {
      return group;
    }

    if (removing() && previous !== undefined) {
      return previous;
    }

    throw Object.assign(new Error(`No skill group "${params.id}".`), { status: 404 });
  });
  const { form, setForm, saved, dirty, reset, leave } = useDraft(
    () => toForm(stored()),
    EMPTY_FORM,
  );
  const request = useDeskRequest();
  const usedBy = () => variants().variants.filter((variant) => variant.skills.includes(params.id));
  const heading = () => [form.name, form.title].find((text) => text !== "") ?? params.id;

  const bind = (key: keyof GroupForm) => ({
    value: form[key],
    onInput: (event: InputEvent & { currentTarget: HTMLInputElement | HTMLTextAreaElement }) => {
      const { value } = event.currentTarget;

      setForm((draft) => {
        draft[key] = value;
      });
    },
  });

  async function save(event: SubmitEvent) {
    event.preventDefault();

    const draft = snapshot(form);
    const changed = { ...draft, label: params.id, items: draft.items.split(",") };
    const groups = content().skills.map((group) => (group.label === params.id ? changed : group));

    if (await request.run(() => saveDeskSkillGroups(groups))) {
      forgetPageChecks();
    }
  }

  async function remove() {
    const users = usedBy().map((variant) => variant.label);
    const question =
      users.length > 0
        ? `${users.join(", ")} print "${saved().name}". Delete it anyway?`
        : `Delete the skill group "${saved().name}"?`;

    if (!confirm(question)) {
      return;
    }

    setRemoving(true);

    const groups = content().skills.filter((group) => group.label !== params.id);

    if (await request.run(() => saveDeskSkillGroups(groups))) {
      forgetPageChecks();
      leave();
      navigate(paths.desk.cv.skills());
    } else {
      setRemoving(false);
    }
  }

  return (
    <form class="desk-page" onSubmit={(event) => void save(event)}>
      <DeskMeta title={`${heading()} · Skills · Desk`} />
      <header class="desk-head">
        <div class="desk-head__text">
          <p class="desk-head__path">
            <a href={paths.desk.cv()}>~/desk/cv</a> / <a href={paths.desk.cv.skills()}>skills</a> /{" "}
            {params.id}
          </p>
          <h1 class="desk-head__title">{heading()}</h1>
          <p class="desk-head__sub">
            The home page shows every group; the variants that pick it print it in the PDF.
          </p>
        </div>

        <DeskMenu
          label="Skill group actions"
          actions={[{ label: "Delete", icon: IconTrash, run: () => void remove(), danger: true }]}
        />
      </header>

      <Show when={request.error() !== "" && !dirty()}>
        <p class="desk-error" role="alert">
          {request.error()}
        </p>
      </Show>

      <div class="panels">
        <DeskFormSection title="in the desk" description="Only you see these, never the site.">
          <label class="field">
            <span class="field__label">name</span>
            <input {...bind("name")} class="input" required />
          </label>
          <div class="field">
            <span class="field__label">id</span>
            <span class={styles.group__id}>{params.id}</span>
            <span class="field__hint">The home page shows it. It can't change.</span>
          </div>
          <label class="field field--wide">
            <span class="field__label">note</span>
            <textarea
              {...bind("note")}
              class="input"
              rows="1"
              placeholder="What this group is for."
            />
          </label>
        </DeskFormSection>

        <DeskFormSection title="on the cv" description="What the CV and the home page show." single>
          <label class="field">
            <span class="field__label">title</span>
            <input {...bind("title")} class="input" required />
            <span class="field__hint">The heading the CV prints.</span>
          </label>
          <label class="field">
            <span class="field__label">skills</span>
            <textarea {...bind("items")} class="input" rows="3" />
            <span class="field__hint">Comma-separated, in display order.</span>
          </label>
        </DeskFormSection>

        <DeskFormSection
          title="printed by"
          description="Pick skill groups in a variant's skills tab."
          single
        >
          <Show
            when={usedBy().length > 0}
            fallback={<p class={styles.group__none}>No variant prints this group.</p>}
          >
            <ul class="form-rows">
              <For each={usedBy()}>
                {(variant) => (
                  <li>
                    <a href={paths.desk.cv(variant.id)} class="text-link">
                      {variant.label}
                    </a>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </DeskFormSection>
      </div>

      <Show when={dirty()}>
        <DeskSaveBar busy={request.busy()} error={request.error()} onDiscard={reset} />
      </Show>
    </form>
  );
}

export const route = {
  preload: () => {
    void getDeskContent();
    void getDeskVariants();
  },
} satisfies RouteDefinition;
