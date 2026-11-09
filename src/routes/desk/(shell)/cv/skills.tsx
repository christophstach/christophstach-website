import { For, Show, createMemo, snapshot } from "solid-js";
import type { GroupForm, TextKey } from "../../../../components/desk/DeskSkillGroup";
import { getDeskContent, getDeskVariants } from "../../../../lib/desk/queries";
import { DeskMeta } from "../../../../components/desk/DeskMeta";
import { DeskSaveBar } from "../../../../components/desk/DeskSaveBar";
import { DeskSkillGroup } from "../../../../components/desk/DeskSkillGroup";
import { IconPlus } from "../../../../components/icons";
import type { RouteDefinition } from "@solidjs/router";
import { forgetPageChecks } from "../../../../lib/desk/page-checks";
import { paths } from "../../../../router";
import { saveDeskSkillGroups } from "../../../../lib/desk/content";
import styles from "../../../../components/desk/page-cv-skills.module.css";
import { useDeskRequest } from "../../../../lib/desk/request";
import { useDraft } from "../../../../lib/desk/draft";
import { useDragReorder } from "../../../../lib/drag-reorder";

export default function SkillsPage() {
  const content = createMemo(() => getDeskContent());
  const variants = createMemo(() => getDeskVariants());
  const { form, setForm, dirty, reset } = useDraft<{ groups: GroupForm[] }>(
    () => ({
      groups: content().skills.map((group) => ({
        label: group.label,
        name: group.name,
        note: group.note,
        title: group.title,
        items: group.items.join(", "),
        isNew: false,
      })),
    }),
    { groups: [] },
  );
  const request = useDeskRequest();

  /** Names of the variants that print this skill group. */
  const usedBy = (label: string) =>
    variants()
      .variants.filter((variant) => variant.skills.includes(label))
      .map((variant) => variant.label);

  const drag = useDragReorder(
    () => form.groups.map((group) => group.label),
    (labels) => {
      setForm((draft) => {
        draft.groups = labels.flatMap(
          (label) => draft.groups.find((group) => group.label === label) ?? [],
        );
      });
    },
  );

  function change(index: number, key: TextKey, value: string) {
    setForm((draft) => {
      const group = draft.groups[index];

      if (group !== undefined) {
        group[key] = value;
      }
    });
  }

  function remove(index: number) {
    const group = form.groups[index];
    const users = group === undefined ? [] : usedBy(group.label);

    // oxlint-disable-next-line no-alert -- a desk-only safety net before dropping printed skills
    if (users.length > 0 && !confirm(`${users.join(", ")} print this group. Remove it anyway?`)) {
      return;
    }

    setForm((draft) => {
      draft.groups.splice(index, 1);
    });
  }

  async function save(event: SubmitEvent) {
    event.preventDefault();

    const groups = snapshot(form).groups.map((group) => ({
      label: group.label.trim(),
      name: group.name,
      note: group.note,
      title: group.title,
      items: group.items.split(","),
    }));

    if (await request.run(() => saveDeskSkillGroups(groups))) {
      forgetPageChecks();
    }
  }

  return (
    <form class="desk-page" onSubmit={(event) => void save(event)}>
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

        <button
          type="button"
          class="button button--outline"
          onClick={() => {
            setForm((draft) => {
              draft.groups.push({
                label: "",
                name: "",
                note: "",
                title: "",
                items: "",
                isNew: true,
              });
            });
          }}
        >
          <IconPlus size={16} />
          Add group
        </button>
      </header>

      <Show when={request.error() !== "" && !dirty()}>
        <p class="desk-error" role="alert">
          {request.error()}
        </p>
      </Show>

      <ol class={styles.groups}>
        <For each={form.groups}>
          {(group, index) => (
            <DeskSkillGroup
              group={group}
              drag={drag}
              usedBy={usedBy(group.label)}
              onChange={(key, value) => {
                change(index(), key, value);
              }}
              onRemove={() => {
                remove(index());
              }}
            />
          )}
        </For>
      </ol>

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
