import { Show, createMemo } from "solid-js";
import { getDeskContent, getDeskProjects } from "../../lib/desk/queries";
import { inOrder, setItems, toggled } from "../../lib/desk/picks";
import type { DeskTableColumn, DeskTableDetail } from "./DeskTable";
import { DeskTable } from "./DeskTable";
import { DeskVariantBullets } from "./DeskVariantBullets";
import type { EntryRecord } from "../../data/cv";
import type { VariantInput } from "../../lib/desk/variants";
import { formatMonth } from "../../lib/format";
import { paths } from "../../router";
import styles from "./DeskVariantPicks.module.css";

type Section = "experience" | "education";
type SetForm = (write: (draft: VariantInput) => void) => void;

interface PicksProps {
  form: VariantInput;
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

/** A row's text: what it's called, a detail line, the desk note. */
interface RowText {
  name: string;
  meta: string;
  note: string;
}

interface PickTableProps<Item> {
  title: string;
  noun: readonly [one: string, other: string];
  /** Under the title, e.g. "3 of 5 printed". */
  note: string;
  edit: string;
  editText: string;
  /** Every item that can be picked. */
  items: Item[];
  /** The picked ids, in print order. */
  picked: string[];
  idOf: (item: Item) => string;
  textOf: (item: Item) => RowText;
  onToggle: (id: string, on: boolean) => void;
  /** The picked ids in a new order. */
  onReorder: (ids: string[]) => void;
  /** More columns after the name, e.g. how many bullets print. */
  columns?: DeskTableColumn<Item>[] | undefined;
  detail?: DeskTableDetail<Item> | undefined;
}

/**
 * One kind of pick as a table: the picked items first, in print order and
 * draggable, then the ones left out, faded. The checkbox picks and unpicks.
 */
function PickTable<Item>(props: PickTableProps<Item>) {
  const isPicked = (item: Item) => props.picked.includes(props.idOf(item));
  const rows = () => [
    ...inOrder(props.picked, props.items, props.idOf),
    ...props.items.filter((item) => !isPicked(item)),
  ];

  return (
    <DeskTable
      title={props.title}
      noun={props.noun}
      note={props.note}
      actions={
        <a href={props.edit} class="text-link">
          {props.editText}
        </a>
      }
      rows={rows()}
      rowKey={props.idOf}
      select={{
        checked: isPicked,
        onToggle: props.onToggle,
        label: (item) => `Print ${props.textOf(item).name}`,
      }}
      reorder={{
        movable: isPicked,
        label: (item) => props.textOf(item).name,
        onReorder: props.onReorder,
      }}
      detail={props.detail}
      columns={[
        {
          id: "name",
          header: props.noun[0],
          primary: true,
          cell: (item) => {
            const text = props.textOf(item);

            return (
              <span class={styles.row__text}>
                <span class={styles.row__name}>{text.name}</span>
                <span class={styles.row__meta}>{text.meta}</span>
                <Show when={text.note !== ""}>
                  <span class={styles.row__note}>{text.note}</span>
                </Show>
              </span>
            );
          },
          search: (item) => {
            const text = props.textOf(item);

            return `${text.name} ${text.meta} ${text.note}`;
          },
        },
        ...(props.columns ?? []),
      ]}
      filters={[
        {
          id: "printed",
          label: "printed",
          options: [
            { value: "yes", label: "yes" },
            { value: "no", label: "no" },
          ],
          value: (item) => (isPicked(item) ? "yes" : "no"),
        },
      ]}
    />
  );
}

function Entries(props: PicksProps & { section: Section }) {
  const content = createMemo(() => getDeskContent());
  const entries = () => content().entries.filter((entry) => entry.section === props.section);
  const ids = () => props.form[props.section].map((pick) => pick.id);
  const isPicked = (entry: EntryRecord) => ids().includes(entry.id);

  return (
    <PickTable
      title={props.section}
      noun={["entry", "entries"]}
      note={`${ids().length} of ${entries().length} printed`}
      edit={paths.desk.cv[props.section]()}
      editText={`Edit ${props.section}`}
      items={entries()}
      picked={ids()}
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
      columns={[
        {
          id: "bullets",
          header: "bullets",
          align: "end",
          cell: (entry) => {
            const printed =
              props.form[props.section].find((pick) => pick.id === entry.id)?.bullets.length ?? 0;

            return isPicked(entry) && entry.bullets.length > 0
              ? `${printed}/${entry.bullets.length}`
              : String(entry.bullets.length);
          },
        },
      ]}
      detail={{
        when: (entry) => isPicked(entry) && entry.bullets.length > 0,
        content: (entry) => (
          <DeskVariantBullets
            form={props.form}
            setForm={props.setForm}
            section={props.section}
            entry={entry}
          />
        ),
      }}
    />
  );
}

function Skills(props: PicksProps) {
  const content = createMemo(() => getDeskContent());
  const groups = () => content().skills;

  return (
    <PickTable
      title="skills"
      noun={["group", "groups"]}
      note={`${props.form.skills.length} of ${groups().length} printed`}
      edit={paths.desk.cv.skills()}
      editText="Edit skills"
      items={groups()}
      picked={props.form.skills}
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
  );
}

function Projects(props: PicksProps) {
  const projects = createMemo(() => getDeskProjects());

  return (
    <PickTable
      title="projects"
      noun={["project", "projects"]}
      note="Printed after the education; the website variant's show on /curriculum"
      edit={paths.desk.cv.projects()}
      editText="Edit projects"
      items={projects()}
      picked={props.form.projects}
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
  );
}

/** Everything a variant picks: its heading, skills, entries with bullets, projects. */
export function DeskVariantPicks(props: PicksProps) {
  return (
    <div class={styles.picks}>
      <Heading form={props.form} setForm={props.setForm} />
      <Skills form={props.form} setForm={props.setForm} />
      <Entries form={props.form} setForm={props.setForm} section="experience" />
      <Entries form={props.form} setForm={props.setForm} section="education" />
      <Projects form={props.form} setForm={props.setForm} />
    </div>
  );
}

export type { SetForm };
