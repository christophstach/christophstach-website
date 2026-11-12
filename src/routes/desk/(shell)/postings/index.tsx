import {
  POSTING_SOURCES,
  POSTING_SOURCE_LABELS,
  POSTING_STATUSES,
  POSTING_STATUS_LABELS,
  WORKPLACES,
  WORKPLACE_LABELS,
} from "../../../../data/postings";
import {
  FIT_TONES,
  SALARY_BANDS,
  companyKey,
  findDuplicates,
  fitTone,
  formatSalary,
  formatShortDay,
  salaryBand,
  salaryTop,
} from "../../../../lib/posting";
import type { Collector, JobPostingRecord, PostingStatus } from "../../../../data/postings";
import { For, Show, createMemo, createSignal } from "solid-js";
import {
  COMPANY_FIELDS,
  COMPANY_FIELD_LABELS,
  COMPANY_FUNDINGS,
  COMPANY_FUNDING_LABELS,
} from "../../../../data/companies";
import { getDeskCollectors, getDeskCompanies, getDeskPostings } from "../../../../lib/desk/queries";
import {
  YC_FUNDING_OPTION,
  companiesByKey,
  companyLabels,
  countryName,
  fundingValues,
} from "../../../../lib/company";
import type { CompanyRecord } from "../../../../data/companies";
import { useNavigate, useSearchParams } from "@solidjs/router";
import { DeskMeta } from "../../../../components/desk/DeskMeta";
import { DeskTable } from "../../../../components/desk/DeskTable";
import type {
  DeskTableColumn,
  DeskTableFilter,
  DeskTableTabs,
} from "../../../../components/desk/DeskTable";
import { IconPlus, IconSparkles, IconStar } from "../../../../components/icons";
import type { RouteDefinition } from "@solidjs/router";
import { addDeskPostingByUrl, setDeskPostingsStatus } from "../../../../lib/desk/postings";
import { formatRelative } from "../../../../lib/format";
import { paths } from "../../../../router";
import styles from "../../../../components/desk/page-postings.module.css";
import { useDeskRequest } from "../../../../lib/desk/request";
import { APPLICATION_STATUSES } from "../../../../data/applications";
import { statusTone } from "../../../../lib/application";

/**
 * Where a posting stands: its application's status once it has one ("Preparing",
 * "Interviewing", …), else its own. New postings stand out.
 */
function postingStatus(posting: JobPostingRecord) {
  if (posting.applicationStatus !== "") {
    return statusTone(posting.applicationStatus);
  }

  return {
    tone: posting.status === "new" ? ("ok" as const) : ("none" as const),
    text: POSTING_STATUS_LABELS[posting.status],
  };
}

/** For the status tabs: postings with an application count as applied. */
function postingState(posting: JobPostingRecord): PostingStatus | "applied" {
  return posting.applicationId === "" ? posting.status : "applied";
}

/** Each posting's likely duplicates (same company and title); see findDuplicates. */
type Duplicates = ReadonlyMap<string, readonly JobPostingRecord[]>;

/** The described companies by their matching key. */
type Companies = ReadonlyMap<string, CompanyRecord>;

/** No labels: a posting whose company isn't described yet. */
const NO_COMPANY = { batch: "", field: "", headquarters: "", funding: "" } as const;

/** The company described for a posting, if any. */
function companyOf(companies: Companies, posting: JobPostingRecord): CompanyRecord | undefined {
  return companies.get(companyKey(posting.company));
}

/** Its company's labels, for the search: "YC W25 Y Combinator, batch W25 AI …". */
function labelWords(companies: Companies, posting: JobPostingRecord): string {
  return companyLabels(companyOf(companies, posting) ?? NO_COMPANY)
    .map((label) => `${label.text} ${label.title}`)
    .join(" ");
}

/** The star in a row: favourite or not, and what toggles it. */
interface Star {
  toggle: (posting: JobPostingRecord) => void;
  busy: () => boolean;
}

const columns = (
  duplicates: Duplicates,
  companies: Companies,
  star: Star,
): DeskTableColumn<JobPostingRecord>[] => [
  {
    id: "favourite",
    header: "favourite",
    control: true,
    cell: (posting) => (
      <button
        type="button"
        class={[styles.star, { [styles["star--on"] ?? ""]: posting.status === "favourite" }]}
        aria-pressed={posting.status === "favourite" ? "true" : "false"}
        aria-label={`Favourite: ${posting.title || posting.externalId}`}
        disabled={star.busy()}
        onClick={() => star.toggle(posting)}
      >
        <IconStar size={16} />
      </button>
    ),
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
          <For each={companyLabels(companyOf(companies, posting) ?? NO_COMPANY)}>
            {(label) => (
              <span
                class={[styles.label, { [styles["label--strong"] ?? ""]: label.strong }]}
                title={label.title}
              >
                {label.text}
              </span>
            )}
          </For>
          {duplicates.has(posting.id) ? (
            <span class={["role-tag", styles.duplicate]}>
              duplicate? {(duplicates.get(posting.id)?.length ?? 0) + 1}×
            </span>
          ) : null}
        </span>
      </span>
    ),
    sort: (posting) => posting.title,
    search: (posting) =>
      `${posting.title} ${posting.company} ${posting.location} ${labelWords(companies, posting)}`,
  },
  {
    id: "fit",
    header: "fit",
    cell: (posting) => (
      <span
        class={[styles.fit, styles[`fit--${fitTone(posting)}`]]}
        title={
          posting.score === null
            ? "Not scored yet"
            : [...posting.score.reasons, ...posting.score.concerns.map((line) => `– ${line}`)].join(
                "\n",
              )
        }
      >
        {posting.score?.score ?? "–"}
      </span>
    ),
    // Unscored sorts last either way.
    sort: (posting) => posting.score?.score ?? "",
    firstDirection: "desc",
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
      <span class={`desk-status desk-status--${postingStatus(posting).tone}`}>
        {postingStatus(posting).text}
      </span>
    ),
    // Applied ones last, by their application's status.
    sort: (posting) =>
      posting.applicationStatus === ""
        ? POSTING_STATUSES.indexOf(posting.status)
        : POSTING_STATUSES.length + APPLICATION_STATUSES.indexOf(posting.applicationStatus),
  },
  {
    id: "found",
    header: "found",
    cell: (posting) => formatRelative(posting.createdAt),
    sort: (posting) => posting.createdAt,
    firstDirection: "desc",
  },
];

/** The countries the described companies sit in, by name. */
function headquarters(companies: Companies): string[] {
  return [
    ...new Set([...companies.values()].flatMap((company) => company.headquarters || [])),
  ].toSorted((one, other) => countryName(one).localeCompare(countryName(other)));
}

/** The status tabs: postings with an application count as applied. */
const STATUS_TABS: DeskTableTabs<JobPostingRecord> = {
  label: "status",
  options: [
    { value: "new", label: POSTING_STATUS_LABELS.new },
    { value: "favourite", label: POSTING_STATUS_LABELS.favourite },
    { value: "applied", label: "Applied" },
    { value: "dismissed", label: POSTING_STATUS_LABELS.dismissed },
  ],
  value: postingState,
  initial: "new",
  all: "All",
};

/** The filters: workplace, salary, the company's field, headquarters and funding;
 * behind "More filters" duplicates, source and which collector found it. */
function filters(
  collectors: Collector[],
  duplicates: Duplicates,
  companies: Companies,
): DeskTableFilter<JobPostingRecord>[] {
  return [
    {
      id: "fit",
      label: "fit",
      options: FIT_TONES,
      value: fitTone,
    },
    {
      id: "duplicates",
      label: "duplicates",
      options: [
        { value: "yes", label: "Likely duplicates" },
        { value: "no", label: "Unique" },
      ],
      value: (posting) => (duplicates.has(posting.id) ? "yes" : "no"),
      more: true,
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
      more: true,
    },
    {
      id: "collector",
      label: "found by",
      options: [
        ...collectors.map((collector) => ({ value: collector.id, label: collector.label })),
        { value: "", label: "Added by hand" },
      ],
      value: (posting) => posting.collectorId,
      more: true,
    },
    {
      id: "field",
      label: "company field",
      options: [
        ...COMPANY_FIELDS.map((field) => ({ value: field, label: COMPANY_FIELD_LABELS[field] })),
        { value: "", label: "Unknown" },
      ],
      value: (posting) => companyOf(companies, posting)?.field ?? "",
    },
    {
      id: "headquarters",
      label: "headquarters",
      options: [
        ...headquarters(companies).map((code) => ({ value: code, label: countryName(code) })),
        { value: "", label: "Unknown" },
      ],
      value: (posting) => companyOf(companies, posting)?.headquarters ?? "",
    },
    {
      id: "funding",
      label: "funding",
      options: [
        YC_FUNDING_OPTION,
        ...COMPANY_FUNDINGS.map((funding) => ({
          value: funding,
          label: COMPANY_FUNDING_LABELS[funding],
        })),
        { value: "", label: "Unknown" },
      ],
      value: (posting) => fundingValues(companyOf(companies, posting)),
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
  const described = createMemo(() => getDeskCompanies());
  const companies = createMemo(() => companiesByKey(described()));
  const duplicates = createMemo(() => findDuplicates(postings()));
  const adding = () => search.new !== undefined;
  const request = useDeskRequest();

  /** Sets the status of the ticked postings; an application keeps its link either way. */
  function setStatus(status: PostingStatus) {
    return (ids: string[]) => request.run(() => setDeskPostingsStatus(ids, status));
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
          <div class={styles.actions}>
            <a href={paths.desk.postings.scoring()} class="button button--outline">
              <IconSparkles size={16} />
              Scoring
            </a>
            <a href={paths.desk.postings({ new: "1" })} class="button button--primary">
              <IconPlus size={16} />
              Add by URL
            </a>
          </div>
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
          columns={columns(duplicates(), companies(), {
            toggle: (posting) =>
              void request.run(() =>
                setDeskPostingsStatus(
                  [posting.id],
                  posting.status === "favourite" ? "new" : "favourite",
                ),
              ),
            busy: request.busy,
          })}
          tabs={STATUS_TABS}
          filters={filters(collectors(), duplicates(), companies())}
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
    void getDeskCompanies();
  },
} satisfies RouteDefinition;
