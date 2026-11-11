import { For, Show, createMemo, createStore } from "solid-js";
import { getDeskProjects, getDeskVariants } from "../../../../../lib/desk/queries";
import { useNavigate, useSearchParams } from "@solidjs/router";
import { DeskMeta } from "../../../../../components/desk/DeskMeta";
import { DeskTable } from "../../../../../components/desk/DeskTable";
import { IconPlus } from "../../../../../components/icons";
import type { RouteDefinition } from "@solidjs/router";
import { paths } from "../../../../../router";
import { saveDeskProject } from "../../../../../lib/desk/content";
import styles from "../../../../../components/desk/page-cv-projects-index.module.css";
import { useDeskRequest } from "../../../../../lib/desk/request";

const EMPTY_FORM = { id: "", name: "", title: "" };

/** The form for a new project, opened by "?new". */
function CreateProject() {
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

    const id = form.id.trim();
    const project = {
      id,
      name: form.name,
      note: "",
      title: form.title,
      description: "",
      tech: [],
      url: "",
    };

    if (await request.run(() => saveDeskProject(project, { create: true }))) {
      setForm(() => ({ ...EMPTY_FORM }));
      navigate(paths.desk.cv.projects(id));
    }
  }

  return (
    <form class={styles.create} onSubmit={(event) => void create(event)}>
      <h2 class={styles.create__title}>New project</h2>

      <div class={styles.create__fields}>
        <label class="field">
          <span class="field__label">id</span>
          <input
            {...bind("id")}
            class="input"
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            placeholder="my-project"
          />
          <span class="field__hint">The URL slug: lowercase letters, digits and hyphens.</span>
        </label>
        <label class="field">
          <span class="field__label">name</span>
          <input {...bind("name")} class="input" required placeholder="My project" />
          <span class="field__hint">Only the desk shows it.</span>
        </label>
        <label class="field">
          <span class="field__label">title</span>
          <input {...bind("title")} class="input" required placeholder="My Project" />
          <span class="field__hint">The heading /curriculum shows.</span>
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
          {request.busy() ? "Creating…" : "Create project"}
        </button>
        <a href={paths.desk.cv.projects()} class="button button--outline">
          Cancel
        </a>
      </div>
    </form>
  );
}

export default function ProjectsPage() {
  const [search] = useSearchParams();
  const projects = createMemo(() => getDeskProjects());
  const variants = createMemo(() => getDeskVariants());
  const creating = () => search.new !== undefined;

  /** Labels of the variants that show a project. */
  const usedBy = (id: string) =>
    variants()
      .variants.filter((variant) => variant.projects.includes(id))
      .map((variant) => variant.label);

  return (
    <div class="desk-page">
      <DeskMeta title="Projects · Desk" />
      <header class="desk-head">
        <div class="desk-head__text">
          <p class="desk-head__path">
            <a href={paths.desk.cv()}>~/desk/cv</a> / projects
          </p>
          <h1 class="desk-head__title">Projects</h1>
          <p class="desk-head__sub">
            Projects for /curriculum. The website variant picks which ones show, and in what order.
          </p>
        </div>

        <Show when={!creating()}>
          <a href={paths.desk.cv.projects({ new: "1" })} class="button button--primary">
            <IconPlus size={16} />
            New project
          </a>
        </Show>
      </header>

      <Show when={creating()}>
        <CreateProject />
      </Show>

      <Show
        when={projects().length > 0}
        fallback={<p class="panel panel__empty">No projects yet.</p>}
      >
        <DeskTable
          title="projects"
          noun={["project", "projects"]}
          rows={projects()}
          rowKey={(project) => project.id}
          rowHref={(project) => paths.desk.cv.projects(project.id)()}
          columns={[
            {
              id: "project",
              header: "project",
              primary: true,
              cell: (project) => (
                <span class={styles.project}>
                  <span class={styles.project__label}>
                    {project.name === "" ? project.title : project.name}
                  </span>
                  <Show when={project.note !== ""}>
                    <span class="desk-note">{project.note}</span>
                  </Show>
                  <span class={styles.project__description}>
                    {project.description === "" ? "No description yet." : project.description}
                  </span>
                  <Show when={project.tech.length > 0}>
                    <span class={styles.project__tech}>
                      <For each={project.tech}>{(tech) => <span class="chip">{tech}</span>}</For>
                    </span>
                  </Show>
                </span>
              ),
              sort: (project) => (project.name === "" ? project.title : project.name),
              search: (project) =>
                [project.name, project.title, project.note, project.description]
                  .concat(project.tech)
                  .join(" "),
            },
            {
              id: "shown",
              header: "shown by",
              cell: (project) =>
                usedBy(project.id).length > 0 ? usedBy(project.id).join(", ") : "no variant",
              sort: (project) => usedBy(project.id).join(", "),
            },
          ]}
          filters={[
            {
              id: "shown",
              label: "shown",
              options: [
                { value: "yes", label: "by a variant" },
                { value: "no", label: "by none" },
              ],
              value: (project) => (usedBy(project.id).length > 0 ? "yes" : "no"),
            },
          ]}
        />
      </Show>
    </div>
  );
}

export const route = {
  preload: () => {
    void getDeskProjects();
    void getDeskVariants();
  },
} satisfies RouteDefinition;
