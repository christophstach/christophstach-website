import { For, Show, createMemo, createSignal, snapshot } from "solid-js";
import { deleteDeskProject, saveDeskProject } from "../../../../../lib/desk/content";
import { getDeskProjects, getDeskVariants } from "../../../../../lib/desk/queries";
import { useNavigate, useParams } from "@solidjs/router";
import { DeskFormSection } from "../../../../../components/desk/DeskFormSection";
import { DeskMenu } from "../../../../../components/desk/DeskMenu";
import { DeskMeta } from "../../../../../components/desk/DeskMeta";
import { DeskSaveBar } from "../../../../../components/desk/DeskSaveBar";
import { IconTrash } from "../../../../../components/icons";
import type { ProjectRecord } from "../../../../../data/projects";
import type { RouteDefinition } from "@solidjs/router";
import { forgetPageChecks } from "../../../../../lib/desk/page-checks";
import { paths } from "../../../../../router";
import styles from "../../../../../components/desk/page-cv-projects-id.module.css";
import { useDeskRequest } from "../../../../../lib/desk/request";
import { useDraft } from "../../../../../lib/desk/draft";

/** The form's state: tech as one comma-separated line. */
function toForm(project: ProjectRecord) {
  return {
    name: project.name,
    note: project.note,
    title: project.title,
    description: project.description,
    tech: project.tech.join(", "),
    url: project.url,
  };
}

type ProjectForm = ReturnType<typeof toForm>;

const EMPTY_FORM: ProjectForm = {
  name: "",
  note: "",
  title: "",
  description: "",
  tech: "",
  url: "",
};

export default function ProjectEditor() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const projects = createMemo(() => getDeskProjects());
  const variants = createMemo(() => getDeskVariants());
  const [removing, setRemoving] = createSignal(false);
  // While deleting, the refetched list no longer has the project: keep
  // showing the last one until the page has navigated away.
  const stored = createMemo((previous?: ProjectRecord) => {
    const project = projects().find((candidate) => candidate.id === params.id);

    if (project !== undefined) {
      return project;
    }

    if (removing() && previous !== undefined) {
      return previous;
    }

    throw Object.assign(new Error(`No project "${params.id}".`), { status: 404 });
  });
  const { form, setForm, saved, dirty, reset, leave } = useDraft(
    () => toForm(stored()),
    EMPTY_FORM,
  );
  const request = useDeskRequest();
  const usedBy = () =>
    variants().variants.filter((variant) => variant.projects.includes(params.id));
  const heading = () => [form.name, form.title].find((text) => text !== "") ?? params.id;

  const bind = (key: keyof ProjectForm) => ({
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
    const project = { ...draft, id: params.id, tech: draft.tech.split(",") };

    if (await request.run(() => saveDeskProject(project, { create: false }))) {
      forgetPageChecks();
    }
  }

  async function remove() {
    const label = saved().name === "" ? saved().title : saved().name;

    // oxlint-disable-next-line no-alert -- a desk-only safety net before deleting
    if (!confirm(`Delete the project "${label}"? Variants that show it drop it.`)) {
      return;
    }

    setRemoving(true);

    if (await request.run(() => deleteDeskProject(params.id))) {
      forgetPageChecks();
      leave();
      navigate(paths.desk.cv.projects());
    } else {
      setRemoving(false);
    }
  }

  return (
    <form class="desk-page" onSubmit={(event) => void save(event)}>
      <DeskMeta title={`${heading()} · Projects · Desk`} />
      <header class="desk-head">
        <div class="desk-head__text">
          <p class="desk-head__path">
            <a href={paths.desk.cv()}>~/desk/cv</a> /{" "}
            <a href={paths.desk.cv.projects()}>projects</a> / {params.id}
          </p>
          <h1 class="desk-head__title">{heading()}</h1>
          <p class="desk-head__sub">
            Printed by the variants that pick it; /curriculum shows the website variant's.
          </p>
        </div>

        <DeskMenu
          label="Project actions"
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
          <label class="field field--wide">
            <span class="field__label">note</span>
            <textarea
              {...bind("note")}
              class="input"
              rows="2"
              placeholder="What this project is for, e.g. which jobs it fits."
            />
          </label>
        </DeskFormSection>

        <DeskFormSection title="basics" description="The title links to the url when there is one.">
          <label class="field">
            <span class="field__label">title</span>
            <input {...bind("title")} class="input" required />
          </label>
          <label class="field">
            <span class="field__label">url</span>
            <input {...bind("url")} class="input" type="url" placeholder="https://…" />
            <span class="field__hint">Optional.</span>
          </label>
        </DeskFormSection>

        <DeskFormSection title="description" description="A few sentences on what it is." single>
          <label class="field">
            <span class="field__label">text</span>
            <textarea {...bind("description")} class="input" rows="5" />
          </label>
        </DeskFormSection>

        <DeskFormSection title="tech" description="Shown as chips under the project." single>
          <label class="field">
            <span class="field__label">technologies</span>
            <input {...bind("tech")} class="input" placeholder="Vue, Nuxt, TypeScript" />
            <span class="field__hint">Comma-separated, in display order.</span>
          </label>
        </DeskFormSection>

        <DeskFormSection
          title="shown by"
          description="Pick projects in a variant's projects tab."
          single
        >
          <Show
            when={usedBy().length > 0}
            fallback={<p class={styles.project__none}>No variant shows this project.</p>}
          >
            <ul class="form-rows">
              <For each={usedBy()}>
                {(variant) => (
                  <li class={styles.project__variant}>
                    <a href={paths.desk.cv(variant.id)} class="text-link">
                      {variant.label}
                    </a>
                    <Show when={variant.id === variants().websiteId}>
                      <span class="role-tag">/curriculum</span>
                    </Show>
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
    void getDeskProjects();
    void getDeskVariants();
  },
} satisfies RouteDefinition;
