import { For, Show, createMemo, createStore } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import { cvContent, cvCounts } from "../../../../lib/desk-cv";
import { DeskMeta } from "../../../../components/desk/DeskMeta";
import { DeskTable } from "../../../../components/desk/DeskTable";
import type { DeskTableColumn, DeskTableFilter } from "../../../../components/desk/DeskTable";
import type { DeskCv } from "../../../../lib/desk/queries";
import { IconPlus } from "../../../../components/icons";
import type { RouteDefinition } from "@solidjs/router";
import { formatRelative } from "../../../../lib/format";
import { getDeskCvs } from "../../../../lib/desk/queries";
import { pageStatus } from "../../../../lib/cv-layout";
import { paths } from "../../../../router";
import { cvChecks } from "../../../../lib/desk/page-checks";
import { saveDeskCv } from "../../../../lib/desk/cvs";
import styles from "../../../../components/desk/page-cv-index.module.css";
import { useDeskRequest } from "../../../../lib/desk/request";

/** A CV's page status: a running check first, then the stored result. */
function status(cv: DeskCv) {
  return cvChecks.running().includes(cv.id)
    ? { tone: "none" as const, text: "checking pages…" }
    : pageStatus(cv.pageFills);
}

/** The form for a new CV, opened by "?new"; "?new&from=<id>" starts from that CV. */
function CreateCv(props: { cvs: DeskCv[]; from: string }) {
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

    const base = props.cvs.find((cv) => cv.id === from());
    const id = form.id.trim();

    if (base === undefined) {
      return;
    }

    const cv = { ...cvContent(base), label: form.label.trim(), note: "" };

    if (await request.run(() => saveDeskCv(id, cv, { create: true }))) {
      setForm(() => ({ id: "", label: "", from: "" }));
      navigate(paths.desk.cvs(id));
    }
  }

  return (
    <form class={styles.create} onSubmit={(event) => void create(event)}>
      <h2 class={styles.create__title}>New CV</h2>

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
            <For each={props.cvs}>
              {(cv) => (
                <option value={cv.id} selected={cv.id === from()}>
                  {cv.label}
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
          {request.busy() ? "Creating…" : "Create CV"}
        </button>
        <a href={paths.desk.cvs()} class="button button--outline">
          Cancel
        </a>
      </div>
    </form>
  );
}

export default function CvList() {
  const [search] = useSearchParams();
  const data = createMemo(() => getDeskCvs());
  const isPublic = (cv: DeskCv) => cv.id === data().primaryId || cv.id === data().websiteId;
  // The public ones first, until a column sorts them.
  const rows = createMemo(() => [
    ...data().cvs.filter((cv) => isPublic(cv)),
    ...data().cvs.filter((cv) => !isPublic(cv)),
  ]);

  const columns: DeskTableColumn<DeskCv>[] = [
    {
      id: "cv",
      header: "cv",
      primary: true,
      cell: (cv) => (
        <span class={styles.cv}>
          <span class={styles.row__top}>
            <span class={styles.cv__label}>{cv.label}</span>
            <Show when={cv.id === data().primaryId}>
              <span class="role-tag">PDF</span>
            </Show>
            <Show when={cv.id === data().websiteId}>
              <span class="role-tag">/curriculum</span>
            </Show>
          </span>
          <span class={styles.row__role}>{cv.role}</span>
          <Show when={cv.note !== ""}>
            <span class="desk-note">{cv.note}</span>
          </Show>
        </span>
      ),
      sort: (cv) => cv.label,
      search: (cv) => `${cv.label} ${cv.id} ${cv.role} ${cv.note}`,
    },
    {
      id: "pages",
      header: "pages",
      cell: (cv) => (
        <span class={`desk-status desk-status--${status(cv).tone}`}>{status(cv).text}</span>
      ),
    },
    {
      id: "contents",
      header: "contents",
      cell: (cv) => cvCounts(cv),
    },
    {
      id: "changed",
      header: "changed",
      cell: (cv) => formatRelative(cv.updatedAt),
      sort: (cv) => cv.updatedAt,
      firstDirection: "desc",
    },
  ];

  const filters: DeskTableFilter<DeskCv>[] = [
    {
      id: "use",
      label: "used for",
      options: [
        { value: "public", label: "public" },
        { value: "private", label: "applications" },
      ],
      value: (cv) => (isPublic(cv) ? "public" : "private"),
    },
    {
      id: "pages",
      label: "pages",
      options: [
        { value: "ok", label: "fits" },
        { value: "warn", label: "needs work" },
        { value: "none", label: "not checked" },
      ],
      value: (cv) => status(cv).tone,
    },
  ];
  const fromQuery = () => (typeof search.from === "string" ? search.from : data().primaryId);

  return (
    <div class="desk-page">
      <DeskMeta title="CVs · Desk" />
      <header class="desk-head">
        <div class="desk-head__text">
          <p class="desk-head__path">~/desk/cvs</p>
          <h1 class="desk-head__title">CVs</h1>
          <p class="desk-head__sub">
            Each CV picks entries and bullets from the CV content. One is the PDF, one the website.
          </p>
        </div>

        <Show when={search.new === undefined}>
          <a href={paths.desk.cvs({ new: "1" })} class="button button--primary">
            <IconPlus size={16} />
            New CV
          </a>
        </Show>
      </header>

      <Show when={search.new !== undefined}>
        <CreateCv cvs={data().cvs} from={fromQuery()} />
      </Show>

      <Show
        when={data().cvs.length > 0}
        fallback={<p class="panel panel__empty">No CVs in the database.</p>}
      >
        <DeskTable
          title="cvs"
          noun={["cv", "cvs"]}
          rows={rows()}
          rowKey={(cv) => cv.id}
          rowHref={(cv) => paths.desk.cvs(cv.id)()}
          columns={columns}
          filters={filters}
        />
      </Show>
    </div>
  );
}

export const route = {
  preload: () => {
    void getDeskCvs();
  },
} satisfies RouteDefinition;
