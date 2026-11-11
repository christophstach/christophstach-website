import { Show, createMemo } from "solid-js";
import { getDeskContent, getDeskProjects } from "../../lib/desk/queries";
import { inOrder, setItems, toggled } from "../../lib/desk/picks";
import { DeskCvBullets } from "./DeskCvBullets";
import { DeskCvRows } from "./DeskCvRows";
import type { EntryRecord } from "../../data/cv";
import type { CvInput } from "../../lib/desk/cvs";
import { formatMonth } from "../../lib/format";
import { paths } from "../../router";
import styles from "./DeskCvPicks.module.css";

type Section = "experience" | "education";
type SetForm = (write: (draft: CvInput) => void) => void;

interface PicksProps {
  form: CvInput;
  setForm: SetForm;
}

function period(entry: EntryRecord): string {
  return `${formatMonth(entry.from)} – ${entry.to === "" ? "Present" : formatMonth(entry.to)}`;
}

function Heading(props: PicksProps) {
  const bind = (key: "role" | "summary") => ({
    value: props.form[key],
    onInput: (event: InputEvent & { currentTarget: HTMLInputElement | HTMLTextAreaElement }) => {
      const { value } = event.currentTarget;

      props.setForm((draft) => {
        draft[key] = value;
      });
    },
  });

  return (
    <section class={styles.picks__section} aria-labelledby="picks-basics">
      <header class={styles.picks__head}>
        <h2 id="picks-basics" class={styles.picks__title}>
          Heading
        </h2>
        <p class={styles.picks__count}>Printed under your name</p>
      </header>
      <div class={styles.picks__fields}>
        <label class="field">
          <span class="field__label">role</span>
          <input {...bind("role")} class="input" />
          <span class="field__hint">The line under your name. Empty prints none.</span>
        </label>
        <label class="field field--wide">
          <span class="field__label">summary</span>
          <textarea {...bind("summary")} class="input" rows="2" />
          <span class="field__hint">One line under the role. Empty prints none.</span>
        </label>
        <label class="field field--wide">
          <span class="field__label">core technologies</span>
          <textarea
            value={props.form.coreTechnologies.join(", ")}
            onInput={(event) => {
              // The server drops empty items.
              const items = event.currentTarget.value.split(",").map((item) => item.trimStart());

              props.setForm((draft) => {
                draft.coreTechnologies = items;
              });
            }}
            class="input"
            rows="1"
            placeholder="TypeScript, Vue, Nuxt"
          />
          <span class="field__hint">
            Comma-separated, printed under the summary in this order. Empty prints none.
          </span>
        </label>
      </div>
    </section>
  );
}

function SectionHead(props: {
  id: string;
  title: string;
  count: string;
  edit: string;
  editText: string;
}) {
  return (
    <header class={styles.picks__head}>
      <h2 id={`picks-${props.id}`} class={styles.picks__title}>
        {props.title}
      </h2>
      <p class={styles.picks__count}>{props.count}</p>
      <a href={props.edit} class={["text-link", styles.picks__edit]}>
        {props.editText}
      </a>
    </header>
  );
}

function Entries(props: PicksProps & { section: Section; title: string }) {
  const content = createMemo(() => getDeskContent());
  const entries = () => content().entries.filter((entry) => entry.section === props.section);
  const ids = () => props.form[props.section].map((pick) => pick.id);
  const picked = () => inOrder(ids(), entries(), (entry) => entry.id);

  return (
    <section class={styles.picks__section} aria-labelledby={`picks-${props.section}`}>
      <SectionHead
        id={props.section}
        title={props.title}
        count={`${ids().length} of ${entries().length} printed`}
        edit={paths.desk.cv[props.section]()}
        editText={`Edit ${props.section}`}
      />
      <DeskCvRows
        picked={picked()}
        leftOut={entries().filter((entry) => !ids().includes(entry.id))}
        idOf={(entry) => entry.id}
        textOf={(entry) => ({
          name: entry.name === "" ? entry.title : entry.name,
          meta: `${entry.title} at ${entry.organization}, ${period(entry)}`,
          note: entry.note,
        })}
        onToggle={(id, on) => {
          const entry = entries().find((candidate) => candidate.id === id);

          props.setForm((draft) => {
            if (on) {
              draft[props.section].push({
                id,
                bullets: entry?.bullets.map((bullet) => bullet.id) ?? [],
              });
            } else {
              setItems(
                draft[props.section],
                draft[props.section].filter((pick) => pick.id !== id),
              );
            }
          });
        }}
        onReorder={(order) => {
          props.setForm((draft) => {
            setItems(
              draft[props.section],
              inOrder(order, draft[props.section], (pick) => pick.id),
            );
          });
        }}
        aside={(entry) => {
          const printed =
            props.form[props.section].find((pick) => pick.id === entry.id)?.bullets.length ?? 0;

          return entry.bullets.length > 0 ? `${printed}/${entry.bullets.length}` : undefined;
        }}
        below={(entry) => (
          <Show when={entry.bullets.length > 0}>
            <DeskCvBullets
              form={props.form}
              setForm={props.setForm}
              section={props.section}
              entry={entry}
            />
          </Show>
        )}
      />
    </section>
  );
}

function Skills(props: PicksProps) {
  const content = createMemo(() => getDeskContent());
  const groups = () => content().skills;

  return (
    <section class={styles.picks__section} aria-labelledby="picks-skills">
      <SectionHead
        id="skills"
        title="Skills"
        count={`${props.form.skills.length} of ${groups().length} printed`}
        edit={paths.desk.cv.skills()}
        editText="Edit skills"
      />
      <DeskCvRows
        picked={inOrder(props.form.skills, groups(), (group) => group.label)}
        leftOut={groups().filter((group) => !props.form.skills.includes(group.label))}
        idOf={(group) => group.label}
        textOf={(group) => ({
          name: group.name === "" ? group.title : group.name,
          meta: group.items.join(", "),
          note: group.note,
        })}
        onToggle={(label, on) => {
          props.setForm((draft) => {
            setItems(draft.skills, toggled(draft.skills, label, on));
          });
        }}
        onReorder={(order) => {
          props.setForm((draft) => {
            setItems(draft.skills, order);
          });
        }}
      />
    </section>
  );
}

function Projects(props: PicksProps) {
  const projects = createMemo(() => getDeskProjects());

  return (
    <section class={styles.picks__section} aria-labelledby="picks-projects">
      <SectionHead
        id="projects"
        title="Projects"
        count="Printed after the education; the website CV's show on /curriculum"
        edit={paths.desk.cv.projects()}
        editText="Edit projects"
      />
      <DeskCvRows
        picked={inOrder(props.form.projects, projects(), (project) => project.id)}
        leftOut={projects().filter((project) => !props.form.projects.includes(project.id))}
        idOf={(project) => project.id}
        textOf={(project) => ({
          name: project.name === "" ? project.title : project.name,
          meta: project.tech.join(", "),
          note: project.note,
        })}
        onToggle={(id, on) => {
          props.setForm((draft) => {
            setItems(draft.projects, toggled(draft.projects, id, on));
          });
        }}
        onReorder={(order) => {
          props.setForm((draft) => {
            setItems(draft.projects, order);
          });
        }}
      />
    </section>
  );
}

/** Everything a CV picks: its heading, skills, entries with bullets, projects. */
export function DeskCvPicks(props: PicksProps) {
  return (
    <div class={styles.picks}>
      <Heading form={props.form} setForm={props.setForm} />
      <Skills form={props.form} setForm={props.setForm} />
      <Entries form={props.form} setForm={props.setForm} section="experience" title="Experience" />
      <Entries form={props.form} setForm={props.setForm} section="education" title="Education" />
      <Projects form={props.form} setForm={props.setForm} />
    </div>
  );
}

export type { SetForm };
