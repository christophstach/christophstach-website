import {
  POSTING_SOURCES,
  POSTING_SOURCE_LABELS,
  POSTING_STATUSES,
  POSTING_STATUS_LABELS,
} from "../../../../data/postings";
import type { Collector, JobPostingRecord, PostingStatus } from "../../../../data/postings";
import { Show, createMemo, createSignal } from "solid-js";
import { getDeskCollectors, getDeskPostings } from "../../../../lib/desk/queries";
import { useNavigate, useSearchParams } from "@solidjs/router";
import { DeskMeta } from "../../../../components/desk/DeskMeta";
import { DeskTable } from "../../../../components/desk/DeskTable";
import type { DeskTableColumn, DeskTableFilter } from "../../../../components/desk/DeskTable";
import { IconPlus } from "../../../../components/icons";
import type { RouteDefinition } from "@solidjs/router";
import { addDeskPostingByUrl } from "../../../../lib/desk/postings";
import { formatRelative } from "../../../../lib/format";
import { paths } from "../../../../router";
import styles from "../../../../components/desk/page-postings.module.css";
import { useDeskRequest } from "../../../../lib/desk/request";

/** New postings stand out; the rest read as plain status. */
function postingStatus(status: PostingStatus) {
  return {
    tone: status === "new" ? ("ok" as const) : ("none" as const),
    text: POSTING_STATUS_LABELS[status],
  };
}

const COLUMNS: DeskTableColumn<JobPostingRecord>[] = [
  {
    id: "posting",
    header: "posting",
    primary: true,
    cell: (posting) => (
      <span class={styles.name}>
        <span class={styles.name__main}>{posting.title || posting.externalId}</span>
        <span class={styles.name__sub}>{posting.company || "–"}</span>
      </span>
    ),
    sort: (posting) => posting.title,
    search: (posting) => `${posting.title} ${posting.company} ${posting.location}`,
  },
  {
    id: "location",
    header: "location",
    cell: (posting) => posting.location || "–",
    sort: (posting) => posting.location,
  },
  {
    id: "status",
    header: "status",
    cell: (posting) => (
      <span class={`desk-status desk-status--${postingStatus(posting.status).tone}`}>
        {postingStatus(posting.status).text}
      </span>
    ),
    sort: (posting) => POSTING_STATUSES.indexOf(posting.status),
  },
  {
    id: "found",
    header: "found",
    cell: (posting) => formatRelative(posting.createdAt),
    sort: (posting) => posting.createdAt,
    firstDirection: "desc",
  },
];

/** The filters: status, source, and which collector found it. */
function filters(collectors: Collector[]): DeskTableFilter<JobPostingRecord>[] {
  return [
    {
      id: "status",
      label: "status",
      options: POSTING_STATUSES.map((status) => ({
        value: status,
        label: POSTING_STATUS_LABELS[status],
      })),
      value: (posting) => posting.status,
    },
    {
      id: "source",
      label: "source",
      options: POSTING_SOURCES.map((source) => ({
        value: source,
        label: POSTING_SOURCE_LABELS[source],
      })),
      value: (posting) => posting.source,
    },
    {
      id: "collector",
      label: "found by",
      options: [
        ...collectors.map((collector) => ({ value: collector.id, label: collector.label })),
        { value: "", label: "Added by hand" },
      ],
      value: (posting) => posting.collectorId,
    },
  ];
}

/** The form that adds a posting by its address, opened by "?new". */
function AddByUrl() {
  const navigate = useNavigate();
  const request = useDeskRequest();
  const [url, setUrl] = createSignal("");

  async function add(event: SubmitEvent) {
    event.preventDefault();

    let id = "";

    if (
      await request.run(async () => {
        id = await addDeskPostingByUrl(url());
      })
    ) {
      navigate(paths.desk.postings(id));
    }
  }

  return (
    <form class={styles.create} onSubmit={(event) => void add(event)}>
      <h2 class={styles.create__title}>Add a posting</h2>

      <label class="field">
        <span class="field__label">address</span>
        <input
          value={url()}
          onInput={(event) => setUrl(event.currentTarget.value)}
          class="input"
          type="url"
          required
          placeholder="https://…"
        />
        <span class="field__hint">
          The job ad's page. Career pages and job boards usually describe the job for search
          engines, which the desk reads. A LinkedIn link keeps only the job's id: fill in the rest
          by hand.
        </span>
      </label>

      <Show when={request.error()}>
        {(error) => (
          <p class={styles.create__error} role="alert">
            {error()}
          </p>
        )}
      </Show>

      <div class={styles.create__actions}>
        <button type="submit" class="button button--primary" disabled={request.busy()}>
          {request.busy() ? "Reading…" : "Add posting"}
        </button>
        <a href={paths.desk.postings()} class="button button--outline">
          Cancel
        </a>
      </div>
    </form>
  );
}

export default function Postings() {
  const [search] = useSearchParams();
  const postings = createMemo(() => getDeskPostings());
  const collectors = createMemo(() => getDeskCollectors());
  const adding = () => search.new !== undefined;

  return (
    <div class="desk-page">
      <DeskMeta title="Postings · Desk" />
      <header class="desk-head">
        <div class="desk-head__text">
          <p class="desk-head__path">~/desk/postings</p>
          <h1 class="desk-head__title">Postings</h1>
          <p class="desk-head__sub">
            Job ads the collectors found or you added: sort them out, apply to the good ones.
          </p>
        </div>

        <Show when={!adding()}>
          <a href={paths.desk.postings({ new: "1" })} class="button button--primary">
            <IconPlus size={16} />
            Add by URL
          </a>
        </Show>
      </header>

      <Show when={adding()}>
        <AddByUrl />
      </Show>

      <Show
        when={postings().length > 0}
        fallback={
          <Show when={!adding()}>
            <p class="panel panel__empty">
              No postings yet. Set up a{" "}
              <a href={paths.desk.collectors()} class="text-link">
                collector
              </a>{" "}
              or add one by URL.
            </p>
          </Show>
        }
      >
        <DeskTable
          title="postings"
          noun={["posting", "postings"]}
          rows={postings()}
          rowKey={(posting) => posting.id}
          rowHref={(posting) => paths.desk.postings(posting.id)()}
          initialSort={{ column: "found", direction: "desc" }}
          columns={COLUMNS}
          filters={filters(collectors())}
        />
      </Show>
    </div>
  );
}

export const route = {
  preload: () => {
    void getDeskPostings();
    void getDeskCollectors();
  },
} satisfies RouteDefinition;
