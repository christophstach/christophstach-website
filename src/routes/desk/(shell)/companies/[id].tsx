import {
  COMMON_COUNTRIES,
  COMPANY_FIELDS,
  COMPANY_FIELD_LABELS,
  COMPANY_FUNDINGS,
  COMPANY_FUNDING_LABELS,
} from "../../../../data/companies";
import type { Company, CompanyRecord, CompanySource } from "../../../../data/companies";
import { For, Show, createMemo, createSignal, snapshot } from "solid-js";
import { IconRefresh, IconTrash } from "../../../../components/icons";
import { companyFacts, countryName } from "../../../../lib/company";
import {
  deleteDeskCompany,
  recheckDeskCompany,
  saveDeskCompany,
} from "../../../../lib/desk/companies";
import { formatRelative } from "../../../../lib/format";
import { getDeskCompanies, getDeskPostings } from "../../../../lib/desk/queries";
import { useNavigate, useParams } from "@solidjs/router";
import { DeskFormSection } from "../../../../components/desk/DeskFormSection";
import { DeskMenu } from "../../../../components/desk/DeskMenu";
import { DeskMeta } from "../../../../components/desk/DeskMeta";
import { DeskSaveBar } from "../../../../components/desk/DeskSaveBar";
import type { RouteDefinition } from "@solidjs/router";
import { companyKey, formatShortDay } from "../../../../lib/posting";
import { paths } from "../../../../router";
import styles from "../../../../components/desk/page-postings.module.css";
import { useDeskRequest } from "../../../../lib/desk/request";
import { useDraft } from "../../../../lib/desk/draft";

const EMPTY_FORM: Company = {
  id: "",
  name: "",
  field: "",
  headquarters: "",
  funding: "",
  website: "",
  note: "",
};

/** The form's fields of a stored company. */
function toForm({
  updatedAt: _updatedAt,
  batch: _batch,
  sources: _sources,
  checkedAt: _checkedAt,
  ...company
}: CompanyRecord): Company {
  return company;
}

const SOURCE_NAMES: Record<CompanySource["kind"], string> = {
  yc: "Y Combinator",
  wikidata: "Wikidata",
  ad: "Its ad",
};

/** The countries to pick from: the common ones, and the stored or suggested one if it isn't. */
function countryOptions(current: string): string[] {
  const codes = current === "" || COMMON_COUNTRIES.includes(current) ? [] : [current];

  return [...codes, ...COMMON_COUNTRIES];
}

export default function CompanyEditor() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const companies = createMemo(() => getDeskCompanies());
  const postings = createMemo(() => getDeskPostings());
  const [removing, setRemoving] = createSignal(false);
  // While deleting, the refetched list no longer has it: keep the last one.
  const stored = createMemo((previous?: CompanyRecord) => {
    const company = companies().find((candidate) => candidate.id === params.id);

    if (company !== undefined) {
      return company;
    }

    if (removing() && previous !== undefined) {
      return previous;
    }

    throw Object.assign(new Error(`No company "${params.id}".`), { status: 404 });
  });
  const { form, setForm, saved, dirty, reset, leave } = useDraft(
    () => toForm(stored()),
    EMPTY_FORM,
  );
  const request = useDeskRequest();
  const own = createMemo(() => {
    const key = companyKey(stored().name);

    return postings().filter((posting) => companyKey(posting.company) === key);
  });

  function set<Key extends keyof Omit<Company, "id">>(key: Key, value: Company[Key]) {
    setForm((draft) => {
      draft[key] = value;
    });
  }

  async function save(event: SubmitEvent) {
    event.preventDefault();

    const { id: _id, ...company } = snapshot(form);

    await request.run(() =>
      saveDeskCompany(params.id, {
        ...company,
        name: company.name.trim(),
        website: company.website.trim(),
        note: company.note.trim(),
      }),
    );
  }

  async function recheck() {
    await request.run(() => recheckDeskCompany(params.id));
  }

  async function remove() {
    if (
      !confirm(
        `Delete "${saved().name}"? Its postings stay. While they name it, the next check describes it anew from the sources.`,
      )
    ) {
      return;
    }

    setRemoving(true);

    if (await request.run(() => deleteDeskCompany(params.id))) {
      leave();
      navigate(paths.desk.companies());
    } else {
      setRemoving(false);
    }
  }

  return (
    <form class="desk-page" onSubmit={(event) => void save(event)}>
      <DeskMeta title={`${saved().name} · Companies · Desk`} />
      <header class="desk-head">
        <div class="desk-head__text">
          <p class="desk-head__path">
            <a href={paths.desk.companies()}>~/desk/companies</a> / {params.id}
          </p>
          <h1 class="desk-head__title">{form.name || params.id}</h1>
          <p class="desk-head__sub">{companyFacts(saved()) || "Not described yet."}</p>
        </div>

        <DeskMenu
          label="Company actions"
          actions={[
            { label: "Check again", icon: IconRefresh, run: () => void recheck() },
            { label: "Delete", icon: IconTrash, run: () => void remove(), danger: true },
          ]}
        />
      </header>

      <Show when={request.error() !== "" && !dirty()}>
        <p class="desk-error" role="alert">
          {request.error()}
        </p>
      </Show>

      <div class="panels">
        <DeskFormSection
          title="found"
          description="What the free sources say: the Y Combinator list, Wikidata and its ads. It fills only empty fields, so what you type stays."
        >
          <dl class={["field", "field--wide", styles.facts]}>
            <dt>checked</dt>
            <dd>
              {request.busy()
                ? "checking…"
                : stored().checkedAt === ""
                  ? "not yet: the next run checks it"
                  : formatRelative(stored().checkedAt)}
            </dd>
            <dt>yc batch</dt>
            <dd>{stored().batch || "–"}</dd>
            <dt>sources</dt>
            <dd>
              <Show when={stored().sources.length > 0} fallback="nothing found">
                <ul class={styles.sources}>
                  <For each={stored().sources}>
                    {(source) => (
                      <li>
                        <Show
                          when={source.kind === "ad"}
                          fallback={
                            <a href={source.url} class="text-link" target="_blank" rel="noreferrer">
                              {SOURCE_NAMES[source.kind]}
                            </a>
                          }
                        >
                          <a href={paths.desk.postings(source.url)()} class="text-link">
                            {SOURCE_NAMES[source.kind]}
                          </a>
                          : “{source.text}”
                        </Show>
                      </li>
                    )}
                  </For>
                </ul>
              </Show>
            </dd>
          </dl>
        </DeskFormSection>

        <DeskFormSection
          title="company"
          description="Postings match it by name, without a legal form like GmbH or Inc."
        >
          <label class="field">
            <span class="field__label">name</span>
            <input
              value={form.name}
              onInput={(event) => set("name", event.currentTarget.value)}
              class="input"
              required
            />
          </label>
          <label class="field">
            <span class="field__label">website</span>
            <input
              value={form.website}
              onInput={(event) => set("website", event.currentTarget.value)}
              class="input"
              type="url"
              placeholder="https://…"
            />
          </label>
          <label class="field">
            <span class="field__label">field</span>
            <select
              class="input"
              onChange={(event) => {
                const field = COMPANY_FIELDS.find((option) => option === event.currentTarget.value);

                set("field", field ?? "");
              }}
            >
              <option value="" selected={form.field === ""}>
                Unknown
              </option>
              <For each={COMPANY_FIELDS}>
                {(field) => (
                  <option value={field} selected={field === form.field}>
                    {COMPANY_FIELD_LABELS[field]}
                  </option>
                )}
              </For>
            </select>
          </label>
          <label class="field">
            <span class="field__label">headquarters</span>
            <select
              class="input"
              onChange={(event) => set("headquarters", event.currentTarget.value)}
            >
              <option value="" selected={form.headquarters === ""}>
                Unknown
              </option>
              <For each={countryOptions(form.headquarters)}>
                {(code) => (
                  <option value={code} selected={code === form.headquarters}>
                    {countryName(code)}
                  </option>
                )}
              </For>
            </select>
          </label>
          <label class="field">
            <span class="field__label">funding</span>
            <select
              class="input"
              onChange={(event) => {
                const funding = COMPANY_FUNDINGS.find(
                  (option) => option === event.currentTarget.value,
                );

                set("funding", funding ?? "");
              }}
            >
              <option value="" selected={form.funding === ""}>
                Unknown
              </option>
              <For each={COMPANY_FUNDINGS}>
                {(funding) => (
                  <option value={funding} selected={funding === form.funding}>
                    {COMPANY_FUNDING_LABELS[funding]}
                  </option>
                )}
              </For>
            </select>
          </label>
          <label class="field field--wide">
            <span class="field__label">note</span>
            <textarea
              value={form.note}
              onInput={(event) => set("note", event.currentTarget.value)}
              class="input"
              rows={4}
              placeholder="What it builds, its investors and last round, what you heard."
            />
          </label>
        </DeskFormSection>

        <DeskFormSection title="postings" description="The postings that name this company.">
          <Show
            when={own().length > 0}
            fallback={<p class={["field--wide", styles.hint]}>No postings name it.</p>}
          >
            <ul class={["field--wide", styles.sources]}>
              <For each={own()}>
                {(posting) => (
                  <li>
                    <a href={paths.desk.postings(posting.id)()} class="text-link">
                      {posting.title || posting.externalId}
                    </a>
                    <span class={styles.hint}>
                      {" "}
                      {[
                        posting.location,
                        posting.postedOn === "" ? "" : formatShortDay(posting.postedOn),
                      ]
                        .filter((part) => part !== "")
                        .join(" · ")}
                    </span>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </DeskFormSection>
      </div>

      <Show when={dirty()}>
        <DeskSaveBar busy={request.busy()} error={request.error()} onDiscard={reset} />
      </Show>
    </form>
  );
}

export const route = {
  preload: () => {
    void getDeskCompanies();
    void getDeskPostings();
  },
} satisfies RouteDefinition;
