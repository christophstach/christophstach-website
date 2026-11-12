import { For, Show, createMemo, createSignal, snapshot } from "solid-js";
import {
  POSTING_SOURCE_LABELS,
  POSTING_STATUSES,
  POSTING_STATUS_LABELS,
  SALARY_CURRENCIES,
  WORKPLACES,
  WORKPLACE_LABELS,
} from "../../../../data/postings";
import type { JobPostingRecord, PostingEdit, PostingStatus } from "../../../../data/postings";
import { IconSend, IconStar, IconTrash } from "../../../../components/icons";
import {
  applyToDeskPosting,
  deleteDeskPosting,
  saveDeskPosting,
  setDeskPostingsStatus,
} from "../../../../lib/desk/postings";
import { getDeskCollectors, getDeskPostings } from "../../../../lib/desk/queries";
import { useNavigate, useParams } from "@solidjs/router";
import { DeskFormSection } from "../../../../components/desk/DeskFormSection";
import { DeskMenu } from "../../../../components/desk/DeskMenu";
import { DeskMeta } from "../../../../components/desk/DeskMeta";
import { DeskSaveBar } from "../../../../components/desk/DeskSaveBar";
import type { RouteDefinition } from "@solidjs/router";
import { findDuplicates, workplaceLabel } from "../../../../lib/posting";
import { formatRelative } from "../../../../lib/format";
import { paths } from "../../../../router";
import styles from "../../../../components/desk/page-postings.module.css";
import { useDeskRequest } from "../../../../lib/desk/request";
import { useDraft } from "../../../../lib/desk/draft";

/** The salary's ends as the inputs hold them: digits, or empty if not stated. */
type PostingForm = Omit<PostingEdit, "salaryMin" | "salaryMax"> & {
  id: string;
  salaryMin: string;
  salaryMax: string;
};

function toForm(posting: JobPostingRecord): PostingForm {
  return {
    id: posting.id,
    company: posting.company,
    title: posting.title,
    location: posting.location,
    description: posting.description,
    postedOn: posting.postedOn,
    workplace: posting.workplace,
    salaryMin: posting.salaryMin === null ? "" : String(posting.salaryMin),
    salaryMax: posting.salaryMax === null ? "" : String(posting.salaryMax),
    salaryCurrency: posting.salaryCurrency,
    status: posting.status,
  };
}

/** An input's amount; null if empty. A number input holds digits or nothing. */
function amountOf(value: string): number | null {
  return value.trim() === "" ? null : Math.round(Number(value));
}

function toEdit({ id: _id, ...form }: PostingForm): PostingEdit {
  const salaryMin = amountOf(form.salaryMin);
  const salaryMax = amountOf(form.salaryMax);
  const stated = salaryMin !== null || salaryMax !== null;

  return {
    ...form,
    salaryMin,
    salaryMax,
    // A currency belongs to a salary; without one, it goes too.
    salaryCurrency: stated ? form.salaryCurrency : "",
  };
}

const EMPTY_FORM: PostingForm = {
  id: "",
  company: "",
  title: "",
  location: "",
  description: "",
  postedOn: "",
  workplace: "",
  salaryMin: "",
  salaryMax: "",
  salaryCurrency: "",
  status: "new",
};

type TextKey =
  | "company"
  | "title"
  | "location"
  | "description"
  | "postedOn"
  | "salaryMin"
  | "salaryMax";

export default function PostingEditor() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const postings = createMemo(() => getDeskPostings());
  const collectors = createMemo(() => getDeskCollectors());
  const [removing, setRemoving] = createSignal(false);
  // While deleting, the refetched list no longer has it: keep the last one.
  const stored = createMemo((previous?: JobPostingRecord) => {
    const posting = postings().find((candidate) => candidate.id === params.id);

    if (posting !== undefined) {
      return posting;
    }

    if (removing() && previous !== undefined) {
      return previous;
    }

    throw Object.assign(new Error(`No posting "${params.id}".`), { status: 404 });
  });
  const { form, setForm, saved, dirty, reset, leave } = useDraft(
    () => toForm(stored()),
    EMPTY_FORM,
  );
  const request = useDeskRequest();
  const duplicates = createMemo(() => findDuplicates(postings()).get(params.id) ?? []);
  const collector = () =>
    collectors().find((candidate) => candidate.id === stored().collectorId)?.label ??
    "Added by hand";

  const bind = (key: TextKey) => ({
    value: form[key],
    onInput: (event: InputEvent & { currentTarget: HTMLInputElement | HTMLTextAreaElement }) => {
      const { value } = event.currentTarget;

      setForm((draft) => {
        draft[key] = value;
      });
    },
  });

  async function save(event: SubmitEvent) {
    event.preventDefault();
    await request.run(() => saveDeskPosting(params.id, toEdit(snapshot(form))));
  }

  /** The quick sort: unsaved changes would be overwritten, so they come first. */
  async function mark(status: PostingStatus) {
    if (dirty()) {
      alert("Save or discard your changes first.");

      return;
    }

    await request.run(() => setDeskPostingsStatus([params.id], status));
  }

  async function apply() {
    if (dirty()) {
      alert("Save or discard your changes first: the application copies the saved posting.");

      return;
    }

    let applicationId = "";

    if (
      await request.run(async () => {
        applicationId = await applyToDeskPosting(params.id);
      })
    ) {
      navigate(paths.desk.applications(applicationId));
    }
  }

  async function remove() {
    if (!confirm(`Delete the posting "${saved().title || params.id}"?`)) {
      return;
    }

    setRemoving(true);

    if (await request.run(() => deleteDeskPosting(params.id))) {
      leave();
      navigate(paths.desk.postings());
    } else {
      setRemoving(false);
    }
  }

  return (
    <form class="desk-page" onSubmit={(event) => void save(event)}>
      <DeskMeta title={`${saved().title || params.id} · Postings · Desk`} />
      <header class="desk-head">
        <div class="desk-head__text">
          <p class="desk-head__path">
            <a href={paths.desk.postings()}>~/desk/postings</a> / {params.id}
          </p>
          <h1 class="desk-head__title">{form.title || params.id}</h1>
          <p class="desk-head__sub">
            {[form.company, form.location].filter((part) => part !== "").join(" · ") || "–"}
          </p>
        </div>

        <DeskMenu
          label="Posting actions"
          actions={[{ label: "Delete", icon: IconTrash, run: () => void remove(), danger: true }]}
        />
      </header>

      <div class={styles.actions}>
        <Show
          when={stored().applicationId}
          fallback={
            <button
              type="button"
              class="button button--primary"
              disabled={request.busy()}
              onClick={() => void apply()}
            >
              <IconSend size={16} />
              Create application
            </button>
          }
        >
          {(applicationId) => (
            <a href={paths.desk.applications(applicationId())} class="button button--primary">
              Open the application
            </a>
          )}
        </Show>
        <Show when={saved().status === "new" || saved().status === "dismissed"}>
          <button
            type="button"
            class="button button--outline"
            disabled={request.busy()}
            onClick={() => void mark("favourite")}
          >
            <IconStar size={16} />
            Favourite
          </button>
        </Show>
        <Show when={saved().status === "favourite"}>
          <button
            type="button"
            class="button button--outline"
            disabled={request.busy()}
            onClick={() => void mark("new")}
          >
            Unfavourite
          </button>
        </Show>
        <Show when={saved().status === "new" || saved().status === "favourite"}>
          <button
            type="button"
            class="button button--outline"
            disabled={request.busy()}
            onClick={() => void mark("dismissed")}
          >
            Dismiss
          </button>
        </Show>
        <a href={stored().url} class="button button--outline" target="_blank" rel="noopener">
          Open the ad
        </a>
      </div>

      <Show when={request.error() !== "" && !dirty()}>
        <p class="desk-error" role="alert">
          {request.error()}
        </p>
      </Show>

      <div class="panels">
        <Show when={duplicates().length > 0}>
          <section class="panel" aria-labelledby="panel-duplicates">
            <header class="panel__head">
              <h2 id="panel-duplicates" class="panel__title">
                likely duplicates
              </h2>
              <p class={["panel__end", styles.hint]}>
                Same company and title: a repost, or the job in another city.
              </p>
            </header>
            <ul class="panel__rows">
              <For each={duplicates()} keyed={(other) => other.id}>
                {(other) => (
                  <li>
                    <a href={paths.desk.postings(other().id)} class="panel-row">
                      <span class="panel-row__label">{other().title}</span>
                      <span class="panel-row__meta">
                        <span>
                          {[other().location, workplaceLabel(other().workplace)]
                            .filter((part) => part !== "")
                            .join(" · ") || "–"}
                        </span>
                        <span>{POSTING_STATUS_LABELS[other().status]}</span>
                        <span>found {formatRelative(other().createdAt)}</span>
                      </span>
                    </a>
                  </li>
                )}
              </For>
            </ul>
          </section>
        </Show>

        <DeskFormSection title="ad" description="The job, as its source describes it.">
          <label class="field">
            <span class="field__label">job title</span>
            <input {...bind("title")} class="input" />
          </label>
          <label class="field">
            <span class="field__label">company</span>
            <input {...bind("company")} class="input" />
          </label>
          <label class="field">
            <span class="field__label">location</span>
            <input {...bind("location")} class="input" />
          </label>
          <label class="field">
            <span class="field__label">posted on</span>
            <input {...bind("postedOn")} class="input" type="date" />
          </label>
          <label class="field">
            <span class="field__label">workplace</span>
            <select
              class="input"
              onChange={(event) => {
                const { value } = event.currentTarget;
                const workplace = WORKPLACES.find((option) => option === value) ?? "";

                setForm((draft) => {
                  draft.workplace = workplace;
                });
              }}
            >
              <option value="" selected={form.workplace === ""}>
                Not stated
              </option>
              <For each={WORKPLACES}>
                {(workplace) => (
                  <option value={workplace} selected={workplace === form.workplace}>
                    {WORKPLACE_LABELS[workplace]}
                  </option>
                )}
              </For>
            </select>
          </label>
          <div class="field">
            <span class="field__label">salary per year</span>
            <span class={styles.salary}>
              <input
                {...bind("salaryMin")}
                class="input"
                type="number"
                min="0"
                step="1000"
                placeholder="from"
                aria-label="salary from"
              />
              <input
                {...bind("salaryMax")}
                class="input"
                type="number"
                min="0"
                step="1000"
                placeholder="to"
                aria-label="salary to"
              />
              <select
                class="input"
                aria-label="currency"
                onChange={(event) => {
                  const { value } = event.currentTarget;
                  const currency = SALARY_CURRENCIES.find((option) => option === value) ?? "";

                  setForm((draft) => {
                    draft.salaryCurrency = currency;
                  });
                }}
              >
                <option value="" selected={form.salaryCurrency === ""}>
                  –
                </option>
                <For each={SALARY_CURRENCIES}>
                  {(currency) => (
                    <option value={currency} selected={currency === form.salaryCurrency}>
                      {currency}
                    </option>
                  )}
                </For>
              </select>
            </span>
            <span class="field__hint">
              Whole amounts, e.g. 60000; leave both empty if not stated.
            </span>
          </div>
          <label class="field">
            <span class="field__label">status</span>
            {/* `selected` on the options: see the CV select in /desk/cvs. */}
            <select
              class="input"
              onChange={(event) => {
                const status = POSTING_STATUSES.find(
                  (option) => option === event.currentTarget.value,
                );

                if (status !== undefined) {
                  setForm((draft) => {
                    draft.status = status;
                  });
                }
              }}
            >
              <For each={POSTING_STATUSES}>
                {(status) => (
                  <option value={status} selected={status === form.status}>
                    {POSTING_STATUS_LABELS[status]}
                  </option>
                )}
              </For>
            </select>
          </label>
          <dl class={["field", styles.facts]}>
            <dt>source</dt>
            <dd>{POSTING_SOURCE_LABELS[stored().source]}</dd>
            <dt>found by</dt>
            <dd>{collector()}</dd>
            <dt>found</dt>
            <dd>{formatRelative(stored().createdAt)}</dd>
          </dl>
          <label class="field field--wide">
            <span class="field__label">description</span>
            <textarea {...bind("description")} class="input" rows="12" />
            <span class="field__hint">
              LinkedIn's mails carry none: paste it from the ad, so it stays once the ad is gone. An
              application made from the posting copies it.
            </span>
          </label>
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
    void getDeskPostings();
    void getDeskCollectors();
  },
} satisfies RouteDefinition;
