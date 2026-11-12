import {
  POSTING_SOURCES,
  POSTING_SOURCE_LABELS,
  POSTING_STATUSES,
  POSTING_STATUS_LABELS,
  WORKPLACES,
  WORKPLACE_LABELS,
} from "../../../../data/postings";
import {
  SALARY_BANDS,
  findDuplicates,
  formatSalary,
  formatShortDay,
  salaryBand,
  salaryTop,
} from "../../../../lib/posting";
import type { Collector, JobPostingRecord, PostingStatus } from "../../../../data/postings";
import { Show, createMemo, createSignal } from "solid-js";
import { getDeskCollectors, getDeskPostings } from "../../../../lib/desk/queries";
import { useNavigate, useSearchParams } from "@solidjs/router";
import { DeskMeta } from "../../../../components/desk/DeskMeta";
import { DeskTable } from "../../../../components/desk/DeskTable";
import type { DeskTableColumn, DeskTableFilter } from "../../../../components/desk/DeskTable";
import { IconPlus, IconStar } from "../../../../components/icons";
import type { RouteDefinition } from "@solidjs/router";
import { addDeskPostingByUrl, setDeskPostingsStatus } from "../../../../lib/desk/postings";
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

/** Each posting's likely duplicates (same company and title); see findDuplicates. */
type Duplicates = ReadonlyMap<string, readonly JobPostingRecord[]>;

/** The star in a row: favourite or not, and what toggles it. */
interface Star {
  toggle: (posting: JobPostingRecord) => void;
  busy: () => boolean;
}

const columns = (duplicates: Duplicates, star: Star): DeskTableColumn<JobPostingRecord>[] => [
  {
    id: "favourite",
    header: "favourite",
    // Applied postings keep their status, so their star stays put.
    cell: (posting) => (
      <button
        type="button"
        class={[styles.star, { [styles["star--on"] ?? ""]: posting.status === "favourite" }]}
        aria-pressed={posting.status === "favourite" ? "true" : "false"}
        aria-label={`Favourite: ${posting.title || posting.externalId}`}
        disabled={star.busy() || posting.status === "applied"}
        onClick={() => star.toggle(posting)}
      >
        <IconStar size={16} />
      </button>
    ),
    sort: (posting) => (posting.status === "favourite" ? 0 : 1),
  },
  {
    id: "posting",
    header: "posting",
    primary: true,
    cell: (posting) => (
      <span class={styles.name}>
        <span class={styles.name__main}>{posting.title || posting.externalId}</span>
        <span class={styles.name__sub}>
          {posting.company || "–"}
          {duplicates.has(posting.id) ? (
            <span class={["role-tag", styles.duplicate]}>
              duplicate? {(duplicates.get(posting.id)?.length ?? 0) + 1}×
            </span>
          ) : null}
        </span>
      </span>
    ),
    sort: (posting) => posting.title,
    search: (posting) => `${posting.title} ${posting.company} ${posting.location}`,
  },
  {
    id: "location",
    header: "location",
    // The place over the workplace; a long place wraps, so the table fits its panel.
    cell: (posting) => (
      <span class={styles.place}>
        <span>{posting.location || "–"}</span>
        {posting.workplace === "" ? null : (
          <span class={styles.place__mode}>{WORKPLACE_LABELS[posting.workplace]}</span>
        )}
      </span>
    ),
    sort: (posting) => posting.location,
  },
  {
    id: "salary",
    header: "salary",
    cell: (posting) => formatSalary(posting) || "–",
    // Not stated sorts last either way.
    sort: (posting) => salaryTop(posting) ?? "",
    firstDirection: "desc",
  },
  {
    id: "posted",
    header: "posted",
    cell: (posting) => (posting.postedOn === "" ? "–" : formatShortDay(posting.postedOn)),
    sort: (posting) => posting.postedOn,
    firstDirection: "desc",
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

/** The filters: status, workplace, salary, duplicates, source, and which collector found it. */
function filters(
  collectors: Collector[],
  duplicates: Duplicates,
): DeskTableFilter<JobPostingRecord>[] {
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
      id: "duplicates",
      label: "duplicates",
      options: [
        { value: "yes", label: "Likely duplicates" },
        { value: "no", label: "Unique" },
      ],
      value: (posting) => (duplicates.has(posting.id) ? "yes" : "no"),
    },
    {
      id: "workplace",
      label: "workplace",
      options: [
        ...WORKPLACES.map((workplace) => ({
          value: workplace,
          label: WORKPLACE_LABELS[workplace],
        })),
        { value: "", label: "Not stated" },
      ],
      value: (posting) => posting.workplace,
    },
    {
      id: "salary",
      label: "salary",
      options: [
        ...SALARY_BANDS.map((band) => ({ value: band.value, label: band.label })),
        { value: "", label: "Not stated" },
      ],
      value: salaryBand,
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
  const duplicates = createMemo(() => findDuplicates(postings()));
  const adding = () => search.new !== undefined;
  const request = useDeskRequest();

  /**
   * Sets the status of the ticked postings. Ones already applied to keep
   * theirs, so their link to the application stays.
   */
  function setStatus(status: PostingStatus) {
    return (ids: string[]) => {
      const applied = new Set(
        postings()
          .filter((posting) => posting.status === "applied")
          .map((posting) => posting.id),
      );

      return request.run(() =>
        setDeskPostingsStatus(
          ids.filter((id) => !applied.has(id)),
          status,
        ),
      );
    };
  }

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
          columns={columns(duplicates(), {
            toggle: (posting) =>
              void request.run(() =>
                setDeskPostingsStatus(
                  [posting.id],
                  posting.status === "favourite" ? "new" : "favourite",
                ),
              ),
            busy: request.busy,
          })}
          filters={filters(collectors(), duplicates())}
          select={{
            label: (posting) => `Tick ${posting.title || posting.externalId}`,
            actions: [
              { label: "Dismiss", run: setStatus("dismissed") },
              { label: "Favourite", run: setStatus("favourite") },
              { label: "Back to new", run: setStatus("new") },
            ],
          }}
        />
        <Show when={request.error()}>
          {(error) => (
            <p class={styles.create__error} role="alert">
              {error()}
            </p>
          )}
        </Show>
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
