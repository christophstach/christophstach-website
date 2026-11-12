import {
  COMPANY_FIELDS,
  COMPANY_FIELD_LABELS,
  COMPANY_FUNDINGS,
  COMPANY_FUNDING_LABELS,
} from "../../../../data/companies";
import { Show, createMemo, createSignal } from "solid-js";
import {
  YC_FUNDING_OPTION,
  companiesByKey,
  countryName,
  fundingValues,
} from "../../../../lib/company";
import { getDeskCompanies, getDeskPostings } from "../../../../lib/desk/queries";
import { useNavigate, useSearchParams } from "@solidjs/router";
import type { CompanyRecord } from "../../../../data/companies";
import { DeskMeta } from "../../../../components/desk/DeskMeta";
import { DeskTable } from "../../../../components/desk/DeskTable";
import type { DeskTableColumn, DeskTableFilter } from "../../../../components/desk/DeskTable";
import { IconPlus } from "../../../../components/icons";
import type { JobPostingRecord } from "../../../../data/postings";
import type { RouteDefinition } from "@solidjs/router";
import { companyKey } from "../../../../lib/posting";
import { createDeskCompany } from "../../../../lib/desk/companies";
import { paths } from "../../../../router";
import styles from "../../../../components/desk/page-postings.module.css";
import { useDeskRequest } from "../../../../lib/desk/request";

/** A company of the list: described in the desk, or only named by postings. */
interface CompanyRow {
  key: string;
  name: string;
  company: CompanyRecord | undefined;
  postings: number;
}

/** The described companies, then the names of postings no company describes yet. */
function companyRows(
  companies: readonly CompanyRecord[],
  postings: readonly JobPostingRecord[],
): CompanyRow[] {
  const byKey = companiesByKey(companies);
  const rows = new Map<string, CompanyRow>(
    companies.map((company) => [
      companyKey(company.name),
      { key: companyKey(company.name), name: company.name, company, postings: 0 },
    ]),
  );

  for (const posting of postings) {
    const key = companyKey(posting.company);

    if (key === "") {
      continue;
    }

    const row = rows.get(key) ?? {
      key,
      name: posting.company.trim(),
      company: byKey.get(key),
      postings: 0,
    };

    row.postings += 1;
    rows.set(key, row);
  }

  return [...rows.values()];
}

const COLUMNS: DeskTableColumn<CompanyRow>[] = [
  {
    id: "company",
    header: "company",
    primary: true,
    cell: (row) => (
      <span class={styles.name}>
        <span class={styles.name__main}>{row.name}</span>
        <span class={styles.name__sub}>
          {row.company === undefined
            ? "not described yet"
            : row.company.field === ""
              ? "–"
              : COMPANY_FIELD_LABELS[row.company.field]}
        </span>
      </span>
    ),
    sort: (row) => row.name.toLowerCase(),
    search: (row) => `${row.name} ${row.company?.note ?? ""}`,
  },
  {
    id: "headquarters",
    header: "headquarters",
    cell: (row) =>
      row.company === undefined || row.company.headquarters === ""
        ? "–"
        : countryName(row.company.headquarters),
    sort: (row) => (row.company === undefined ? "" : countryName(row.company.headquarters)),
  },
  {
    id: "funding",
    header: "funding",
    cell: (row) =>
      row.company === undefined || row.company.funding === ""
        ? "–"
        : COMPANY_FUNDING_LABELS[row.company.funding],
    sort: (row) => row.company?.funding ?? "",
  },
  {
    id: "postings",
    header: "postings",
    cell: (row) => String(row.postings),
    sort: (row) => row.postings,
    firstDirection: "desc",
  },
];

/** Field, headquarters and funding; a company not described counts as unknown in each. */
function filters(rows: readonly CompanyRow[]): DeskTableFilter<CompanyRow>[] {
  const countries = [
    ...new Set(
      rows.flatMap((row) => (row.company?.headquarters ? [row.company.headquarters] : [])),
    ),
  ].toSorted((one, other) => countryName(one).localeCompare(countryName(other)));

  return [
    {
      id: "described",
      label: "described",
      options: [
        { value: "yes", label: "Described" },
        { value: "no", label: "Not yet" },
      ],
      value: (row) => (row.company === undefined ? "no" : "yes"),
      more: true,
    },
    {
      id: "field",
      label: "field",
      options: [
        ...COMPANY_FIELDS.map((field) => ({ value: field, label: COMPANY_FIELD_LABELS[field] })),
        { value: "", label: "Unknown" },
      ],
      value: (row) => row.company?.field ?? "",
    },
    {
      id: "headquarters",
      label: "headquarters",
      options: [
        ...countries.map((code) => ({ value: code, label: countryName(code) })),
        { value: "", label: "Unknown" },
      ],
      value: (row) => row.company?.headquarters ?? "",
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
      value: (row) => fundingValues(row.company),
    },
  ];
}

/** The form that starts describing a company, opened by "?new", its name from "?name". */
function CreateCompany(props: { name: string }) {
  const navigate = useNavigate();
  const request = useDeskRequest();
  // The name from the row clicked, until typed over.
  const [typed, setTyped] = createSignal<string>();
  const name = () => typed() ?? props.name;

  async function create(event: SubmitEvent) {
    event.preventDefault();

    let id = "";

    if (
      await request.run(async () => {
        id = await createDeskCompany(name().trim());
      })
    ) {
      navigate(paths.desk.companies(id));
    }
  }

  return (
    <form class={styles.create} onSubmit={(event) => void create(event)}>
      <h2 class={styles.create__title}>Describe a company</h2>

      <label class="field">
        <span class="field__label">name</span>
        <input
          value={name()}
          onInput={(event) => setTyped(event.currentTarget.value)}
          class="input"
          required
          placeholder="Example Labs"
        />
        <span class="field__hint">
          As the postings name it: a legal form like "GmbH" or "Inc." doesn't matter, the rest does.
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
          {request.busy() ? "Creating…" : "Describe company"}
        </button>
        <a href={paths.desk.companies()} class="button button--outline">
          Cancel
        </a>
      </div>
    </form>
  );
}

export default function Companies() {
  const [search] = useSearchParams();
  const companies = createMemo(() => getDeskCompanies());
  const postings = createMemo(() => getDeskPostings());
  const rows = createMemo(() => companyRows(companies(), postings()));
  const adding = () => search.new !== undefined;
  const name = () => (typeof search.name === "string" ? search.name : "");

  return (
    <div class="desk-page">
      <DeskMeta title="Companies · Desk" />
      <header class="desk-head">
        <div class="desk-head__text">
          <p class="desk-head__path">~/desk/companies</p>
          <h1 class="desk-head__title">Companies</h1>
          <p class="desk-head__sub">
            Who the postings come from: what they do, where they sit and how they're funded,
            described once for all their postings.
          </p>
        </div>

        <Show when={!adding()}>
          <a href={paths.desk.companies({ new: "1" })} class="button button--primary">
            <IconPlus size={16} />
            Describe a company
          </a>
        </Show>
      </header>

      <Show when={adding()}>
        <CreateCompany name={name()} />
      </Show>

      <Show
        when={rows().length > 0}
        fallback={
          <Show when={!adding()}>
            <p class="panel panel__empty">
              No companies yet: they show here once postings name them.
            </p>
          </Show>
        }
      >
        <DeskTable
          title="companies"
          noun={["company", "companies"]}
          rows={rows()}
          rowKey={(row) => row.key}
          rowHref={(row) =>
            row.company === undefined
              ? paths.desk.companies({ new: "1", name: row.name })
              : paths.desk.companies(row.company.id)()
          }
          initialSort={{ column: "postings", direction: "desc" }}
          columns={COLUMNS}
          filters={filters(rows())}
        />
      </Show>
    </div>
  );
}

export const route = {
  preload: () => {
    void getDeskCompanies();
    void getDeskPostings();
  },
} satisfies RouteDefinition;
