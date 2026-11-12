import { COLLECTOR_TYPES, COLLECTOR_TYPE_LABELS } from "../../../../data/postings";
import type { Collector, CollectorType } from "../../../../data/postings";
import { For, Show, createMemo, createStore } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import { DeskMeta } from "../../../../components/desk/DeskMeta";
import { DeskTable } from "../../../../components/desk/DeskTable";
import type { DeskTableColumn } from "../../../../components/desk/DeskTable";
import { IconPlus } from "../../../../components/icons";
import type { RouteDefinition } from "@solidjs/router";
import { createDeskCollector } from "../../../../lib/desk/postings";
import { formatRelative } from "../../../../lib/format";
import { getDeskCollectors } from "../../../../lib/desk/queries";
import { paths } from "../../../../router";
import { showSecret } from "../../../../lib/desk/collector-secret";
import styles from "../../../../components/desk/page-postings.module.css";
import { useDeskRequest } from "../../../../lib/desk/request";

/** Paused, failing, waiting for its first run, or fine. */
function collectorStatus(collector: Collector) {
  if (!collector.active) {
    return { tone: "none" as const, text: "paused" };
  }

  if (collector.lastError !== "") {
    return { tone: "warn" as const, text: collector.lastError };
  }

  if (collector.lastRunAt === "") {
    return { tone: "none" as const, text: "never ran" };
  }

  return { tone: "ok" as const, text: `found ${collector.lastFound}, ${collector.lastAdded} new` };
}

const COLUMNS: DeskTableColumn<Collector>[] = [
  {
    id: "collector",
    header: "collector",
    primary: true,
    cell: (collector) => (
      <span class={styles.name}>
        <span class={styles.name__main}>{collector.label}</span>
        <span class={styles.name__sub}>{COLLECTOR_TYPE_LABELS[collector.type].name}</span>
      </span>
    ),
    sort: (collector) => collector.label,
    search: (collector) => `${collector.label} ${collector.id}`,
  },
  {
    id: "status",
    header: "last run",
    cell: (collector) => (
      <span class={`desk-status desk-status--${collectorStatus(collector).tone}`}>
        {collectorStatus(collector).text}
      </span>
    ),
  },
  {
    id: "ran",
    header: "ran",
    cell: (collector) => (collector.lastRunAt === "" ? "–" : formatRelative(collector.lastRunAt)),
    sort: (collector) => collector.lastRunAt,
    firstDirection: "desc",
  },
  {
    id: "postings",
    header: "postings",
    cell: (collector) => String(collector.postings),
    sort: (collector) => collector.postings,
    firstDirection: "desc",
  },
];

/** The form for a new collector, opened by "?new". */
function CreateCollector() {
  const navigate = useNavigate();
  const request = useDeskRequest();
  const [form, setForm] = createStore<{ id: string; label: string; type: CollectorType }>({
    id: "",
    label: "",
    type: "linkedin-email",
  });

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

    const id = form.id.trim();
    let secret = "";

    if (
      await request.run(async () => {
        secret = await createDeskCollector(id, { type: form.type, label: form.label.trim() });
      })
    ) {
      showSecret(id, secret);
      navigate(paths.desk.collectors(id));
    }
  }

  return (
    <form class={styles.create} onSubmit={(event) => void create(event)}>
      <h2 class={styles.create__title}>New collector</h2>

      <div class={styles.create__fields}>
        <label class="field">
          <span class="field__label">type</span>
          <select
            class="input"
            onChange={(event) => {
              const type = COLLECTOR_TYPES.find((option) => option === event.currentTarget.value);

              if (type !== undefined) {
                setForm((draft) => {
                  draft.type = type;
                });
              }
            }}
          >
            <For each={COLLECTOR_TYPES}>
              {(type) => (
                <option value={type} selected={type === form.type}>
                  {COLLECTOR_TYPE_LABELS[type].name}
                </option>
              )}
            </For>
          </select>
          <span class="field__hint">{COLLECTOR_TYPE_LABELS[form.type].hint}</span>
        </label>

        <label class="field">
          <span class="field__label">name</span>
          <input {...bind("label")} class="input" required placeholder="LinkedIn alerts" />
        </label>

        <label class="field">
          <span class="field__label">id</span>
          <input
            {...bind("id")}
            class="input"
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            placeholder="linkedin-alerts"
          />
          <span class="field__hint">
            The URL slug, part of the address the collector sends to: lowercase letters, digits and
            hyphens.
          </span>
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
          {request.busy() ? "Creating…" : "Create collector"}
        </button>
        <a href={paths.desk.collectors()} class="button button--outline">
          Cancel
        </a>
      </div>
    </form>
  );
}

export default function Collectors() {
  const [search] = useSearchParams();
  const collectors = createMemo(() => getDeskCollectors());
  const adding = () => search.new !== undefined;

  return (
    <div class="desk-page">
      <DeskMeta title="Collectors · Desk" />
      <header class="desk-head">
        <div class="desk-head__text">
          <p class="desk-head__path">~/desk/collectors</p>
          <h1 class="desk-head__title">Collectors</h1>
          <p class="desk-head__sub">
            What brings job ads into the postings: each has its own address and secret.
          </p>
        </div>

        <Show when={!adding()}>
          <a href={paths.desk.collectors({ new: "1" })} class="button button--primary">
            <IconPlus size={16} />
            New collector
          </a>
        </Show>
      </header>

      <Show when={adding()}>
        <CreateCollector />
      </Show>

      <Show
        when={collectors().length > 0}
        fallback={
          <Show when={!adding()}>
            <p class="panel panel__empty">
              No collectors yet. Make one for LinkedIn's job alert mails.
            </p>
          </Show>
        }
      >
        <DeskTable
          title="collectors"
          noun={["collector", "collectors"]}
          rows={collectors()}
          rowKey={(collector) => collector.id}
          rowHref={(collector) => paths.desk.collectors(collector.id)()}
          initialSort={{ column: "collector", direction: "asc" }}
          columns={COLUMNS}
        />
      </Show>
    </div>
  );
}

export const route = {
  preload: () => {
    void getDeskCollectors();
  },
} satisfies RouteDefinition;
