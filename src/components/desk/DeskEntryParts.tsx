import { For, Show } from "solid-js";
import { IconGripVertical, IconPlus, IconTrash } from "../icons";
import { DeskFormSection } from "./DeskFormSection";
import type { EntryRecord } from "../../data/cv";
import { setItems } from "../../lib/desk/picks";
import styles from "./DeskEntryEditor.module.css";
import { useDragReorder } from "../../lib/drag-reorder";

// The parts of the entry editor: its form state, and the bullet and link lists.

type Section = EntryRecord["section"];

/** The form's state: tech as one comma-separated line. */
function toForm(entry: EntryRecord) {
  return {
    name: entry.name,
    note: entry.note,
    title: entry.title,
    organization: entry.organization,
    location: entry.location,
    from: entry.from,
    to: entry.to,
    tech: entry.tech.join(", "),
    bullets: entry.bullets.map((bullet) => ({ ...bullet })),
    links: entry.links.map((link) => ({ ...link })),
  };
}

type EntryForm = ReturnType<typeof toForm>;

/** A form with nothing in it, before the entry has loaded. */
const EMPTY_ENTRY_FORM: EntryForm = {
  name: "",
  note: "",
  title: "",
  organization: "",
  location: "",
  from: "",
  to: "",
  tech: "",
  bullets: [],
  links: [],
};
type SetForm = (write: (draft: EntryForm) => void) => void;
type TextKey = "name" | "note" | "title" | "organization" | "location" | "from" | "to" | "tech";

/** Value and input handler binding a text field of the form. */
function bind(form: EntryForm, setForm: SetForm, key: TextKey) {
  return {
    value: form[key],
    onInput: (event: InputEvent & { currentTarget: HTMLInputElement | HTMLTextAreaElement }) => {
      const { value } = event.currentTarget;

      setForm((draft) => {
        draft[key] = value;
      });
    },
  };
}

interface BulletsProps {
  form: EntryForm;
  setForm: SetForm;
  usedBy: (bulletId?: string) => string[];
}

function Bullets(props: BulletsProps) {
  const drag = useDragReorder(
    () => props.form.bullets.map((bullet) => bullet.id),
    (ids) => {
      props.setForm((draft) => {
        setItems(
          draft.bullets,
          ids.flatMap((id) => draft.bullets.find((bullet) => bullet.id === id) ?? []),
        );
      });
    },
  );

  /** A new bullet gets an id that no bullet of this entry has had in the draft. */
  function addBullet() {
    const taken = new Set(props.form.bullets.map((bullet) => bullet.id));
    let number = props.form.bullets.length + 1;

    while (taken.has(`bullet-${number}`)) {
      number += 1;
    }

    const id = `bullet-${number}`;

    props.setForm((draft) => {
      draft.bullets.push({ id, text: "" });
    });
  }

  function removeBullet(bulletId: string) {
    const users = props.usedBy(bulletId);

    if (users.length > 0 && !confirm(`${users.join(", ")} print this bullet. Remove it anyway?`)) {
      return;
    }

    props.setForm((draft) => {
      setItems(
        draft.bullets,
        draft.bullets.filter((bullet) => bullet.id !== bulletId),
      );
    });
  }

  return (
    <DeskFormSection
      title="bullets"
      description="Variants pick bullets one by one. Drag to set the order new picks start with."
      single
    >
      <Show when={props.form.bullets.length > 0}>
        <ol class="form-rows">
          <For each={props.form.bullets} keyed={(bullet) => bullet.id}>
            {(bullet, index) => (
              <li
                class={[
                  styles.bullet,
                  { [styles["bullet--dragged"] ?? ""]: drag.dragged() === bullet().id },
                ]}
                draggable="true"
                onDragStart={(event) => {
                  drag.start(bullet().id, event);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  drag.over(bullet().id);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                }}
                onDragEnd={() => {
                  drag.end();
                }}
              >
                <button
                  type="button"
                  class={styles.bullet__handle}
                  aria-label="Move bullet: arrow up or down"
                  title="Drag, or use the arrow keys"
                  onKeyDown={(event) => {
                    drag.key(bullet().id, event);
                  }}
                >
                  <IconGripVertical size={16} />
                </button>

                <div class={styles.bullet__body}>
                  <textarea
                    value={bullet().text}
                    onInput={(event) => {
                      const { value } = event.currentTarget;

                      props.setForm((draft) => {
                        const target = draft.bullets[index()];

                        if (target !== undefined) {
                          target.text = value;
                        }
                      });
                    }}
                    class={["input", styles.bullet__text]}
                    rows="2"
                    required
                    aria-label={`Bullet ${bullet().id}`}
                  />
                  <span class={styles.bullet__meta}>
                    {props.usedBy(bullet().id).length > 0
                      ? `in ${props.usedBy(bullet().id).join(", ")}`
                      : "in no variant"}
                  </span>
                </div>

                <button
                  type="button"
                  class="icon-button"
                  aria-label="Remove bullet"
                  title="Remove bullet"
                  onClick={() => {
                    removeBullet(bullet().id);
                  }}
                >
                  <IconTrash size={16} />
                </button>
              </li>
            )}
          </For>
        </ol>
      </Show>

      <button
        type="button"
        class={["button button--outline", styles["add-button"]]}
        onClick={addBullet}
      >
        <IconPlus size={16} />
        Add bullet
      </button>
    </DeskFormSection>
  );
}

function Links(props: { form: EntryForm; setForm: SetForm }) {
  const setLink = (index: number, key: "text" | "href", value: string) => {
    props.setForm((draft) => {
      const link = draft.links[index];

      if (link !== undefined) {
        link[key] = value;
      }
    });
  };

  return (
    <DeskFormSection title="links" description="Shown under the entry, e.g. a thesis." single>
      <Show when={props.form.links.length > 0}>
        <ul class="form-rows">
          <For each={props.form.links}>
            {(link, index) => (
              <li class="link-row">
                <input
                  value={link.text}
                  onInput={(event) => {
                    setLink(index(), "text", event.currentTarget.value);
                  }}
                  class="input"
                  placeholder="Text"
                  aria-label="Link text"
                  required
                />
                <input
                  value={link.href}
                  onInput={(event) => {
                    setLink(index(), "href", event.currentTarget.value);
                  }}
                  class="input link-row__href"
                  placeholder="https://… or /file.pdf"
                  aria-label="Link address"
                  required
                />
                <button
                  type="button"
                  class="icon-button"
                  aria-label="Remove link"
                  title="Remove link"
                  onClick={() => {
                    props.setForm((draft) => {
                      draft.links.splice(index(), 1);
                    });
                  }}
                >
                  <IconTrash size={16} />
                </button>
              </li>
            )}
          </For>
        </ul>
      </Show>

      <button
        type="button"
        class={["button button--outline", styles["add-button"]]}
        onClick={() => {
          props.setForm((draft) => {
            draft.links.push({ text: "", href: "" });
          });
        }}
      >
        <IconPlus size={16} />
        Add link
      </button>
    </DeskFormSection>
  );
}

export { Bullets, EMPTY_ENTRY_FORM, Links, bind, toForm };
export type { EntryForm, Section, SetForm };
