import { For, Show, createMemo, createStore } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import { variantContent, variantCounts } from "../../../../lib/desk-variant";
import { DeskMeta } from "../../../../components/desk/DeskMeta";
import { DeskTable } from "../../../../components/desk/DeskTable";
import type { DeskTableColumn, DeskTableFilter } from "../../../../components/desk/DeskTable";
import type { DeskVariant } from "../../../../lib/desk/queries";
import { IconPlus } from "../../../../components/icons";
import type { RouteDefinition } from "@solidjs/router";
import { formatRelative } from "../../../../lib/format";
import { getDeskVariants } from "../../../../lib/desk/queries";
import { pageStatus } from "../../../../lib/cv-layout";
import { paths } from "../../../../router";
import { variantChecks } from "../../../../lib/desk/page-checks";
import { saveDeskVariant } from "../../../../lib/desk/variants";
import styles from "../../../../components/desk/page-cv-index.module.css";
import { useDeskRequest } from "../../../../lib/desk/request";

/** A variant's page status: a running check first, then the stored result. */
function status(variant: DeskVariant) {
  return variantChecks.running().includes(variant.id)
    ? { tone: "none" as const, text: "checking pages…" }
    : pageStatus(variant.pageFills);
}

/** The form for a new variant, opened by "?new"; "?new&from=<id>" starts from that variant. */
function CreateVariant(props: { variants: DeskVariant[]; from: string }) {
  const navigate = useNavigate();
  const request = useDeskRequest();
  const [form, setForm] = createStore({ id: "", label: "", from: "" });
  const from = () => (form.from === "" ? props.from : form.from);

  const bind = (key: "id" | "label") => ({
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

    const base = props.variants.find((variant) => variant.id === from());
    const id = form.id.trim();

    if (base === undefined) {
      return;
    }

    const variant = { ...variantContent(base), label: form.label.trim(), note: "" };

    if (await request.run(() => saveDeskVariant(id, variant, { create: true }))) {
      setForm(() => ({ id: "", label: "", from: "" }));
      navigate(paths.desk.cv(id));
    }
  }

  return (
    <form class={styles.create} onSubmit={(event) => void create(event)}>
      <h2 class={styles.create__title}>New variant</h2>

      <div class={styles.create__fields}>
        <label class="field">
          <span class="field__label">id</span>
          <input
            {...bind("id")}
            class="input"
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            placeholder="backend"
          />
          <span class="field__hint">The URL slug: lowercase letters, digits and hyphens.</span>
        </label>

        <label class="field">
          <span class="field__label">name</span>
          <input {...bind("label")} class="input" required placeholder="Backend" />
        </label>

        <label class="field">
          <span class="field__label">based on</span>
          {/* `selected` on the options, not `value` on the select: the select's
              value is set before its options exist, so it would fall back to
              the first option while the form still holds `from()`. */}
          <select
            class="input"
            onChange={(event) => {
              const { value } = event.currentTarget;

              setForm((draft) => {
                draft.from = value;
              });
            }}
          >
            <For each={props.variants}>
              {(variant) => (
                <option value={variant.id} selected={variant.id === from()}>
                  {variant.label}
                </option>
              )}
            </For>
          </select>
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
          {request.busy() ? "Creating…" : "Create variant"}
        </button>
        <a href={paths.desk.cv()} class="button button--outline">
          Cancel
        </a>
      </div>
    </form>
  );
}

export default function VariantList() {
  const [search] = useSearchParams();
  const data = createMemo(() => getDeskVariants());
  const isPublic = (variant: DeskVariant) =>
    variant.id === data().primaryId || variant.id === data().websiteId;
  // The public ones first, until a column sorts them.
  const rows = createMemo(() => [
    ...data().variants.filter((variant) => isPublic(variant)),
    ...data().variants.filter((variant) => !isPublic(variant)),
  ]);

  const columns: DeskTableColumn<DeskVariant>[] = [
    {
      id: "variant",
      header: "variant",
      primary: true,
      cell: (variant) => (
        <span class={styles.variant}>
          <span class={styles.row__top}>
            <span class={styles.variant__label}>{variant.label}</span>
            <Show when={variant.id === data().primaryId}>
              <span class="role-tag">PDF</span>
            </Show>
            <Show when={variant.id === data().websiteId}>
              <span class="role-tag">/curriculum</span>
            </Show>
          </span>
          <span class={styles.row__role}>{variant.role}</span>
          <Show when={variant.note !== ""}>
            <span class="desk-note">{variant.note}</span>
          </Show>
        </span>
      ),
      sort: (variant) => variant.label,
      search: (variant) => `${variant.label} ${variant.id} ${variant.role} ${variant.note}`,
    },
    {
      id: "pages",
      header: "pages",
      cell: (variant) => (
        <span class={`desk-status desk-status--${status(variant).tone}`}>
          {status(variant).text}
        </span>
      ),
    },
    {
      id: "contents",
      header: "contents",
      cell: (variant) => variantCounts(variant),
    },
    {
      id: "changed",
      header: "changed",
      cell: (variant) => formatRelative(variant.updatedAt),
      sort: (variant) => variant.updatedAt,
      firstDirection: "desc",
    },
  ];

  const filters: DeskTableFilter<DeskVariant>[] = [
    {
      id: "use",
      label: "used for",
      options: [
        { value: "public", label: "public" },
        { value: "private", label: "applications" },
      ],
      value: (variant) => (isPublic(variant) ? "public" : "private"),
    },
    {
      id: "pages",
      label: "pages",
      options: [
        { value: "ok", label: "fits" },
        { value: "warn", label: "needs work" },
        { value: "none", label: "not checked" },
      ],
      value: (variant) => status(variant).tone,
    },
  ];
  const fromQuery = () => (typeof search.from === "string" ? search.from : data().primaryId);

  return (
    <div class="desk-page">
      <DeskMeta title="CV variants · Desk" />
      <header class="desk-head">
        <div class="desk-head__text">
          <p class="desk-head__path">~/desk/cv</p>
          <h1 class="desk-head__title">CV variants</h1>
          <p class="desk-head__sub">
            Each variant picks entries and bullets from the CV. One is the PDF, one the website.
          </p>
        </div>

        <Show when={search.new === undefined}>
          <a href={paths.desk.cv({ new: "1" })} class="button button--primary">
            <IconPlus size={16} />
            New variant
          </a>
        </Show>
      </header>

      <Show when={search.new !== undefined}>
        <CreateVariant variants={data().variants} from={fromQuery()} />
      </Show>

      <Show
        when={data().variants.length > 0}
        fallback={<p class="panel panel__empty">No CV variants in the database.</p>}
      >
        <DeskTable
          title="variants"
          noun={["variant", "variants"]}
          rows={rows()}
          rowKey={(variant) => variant.id}
          rowHref={(variant) => paths.desk.cv(variant.id)()}
          columns={columns}
          filters={filters}
        />
      </Show>
    </div>
  );
}

export const route = {
  preload: () => {
    void getDeskVariants();
  },
} satisfies RouteDefinition;
