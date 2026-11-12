import {
  APPLICATION_SOURCES,
  APPLICATION_STATUSES,
  SOURCE_LABELS,
  STATUS_LABELS,
} from "../../../../data/applications";
import type { Application, ApplicationRecord } from "../../../../data/applications";
import { Show, createMemo, createStore } from "solid-js";
import { applicationName, isDue, nextStepText, statusTone } from "../../../../lib/application";
import { useNavigate, useSearchParams } from "@solidjs/router";
import { DeskMeta } from "../../../../components/desk/DeskMeta";
import { DeskTable } from "../../../../components/desk/DeskTable";
import type { DeskTableColumn, DeskTableFilter } from "../../../../components/desk/DeskTable";
import { IconPlus } from "../../../../components/icons";
import type { RouteDefinition } from "@solidjs/router";
import { formatDay } from "../../../../lib/format";
import { getDeskApplications } from "../../../../lib/desk/queries";
import { paths } from "../../../../router";
import { saveDeskApplication } from "../../../../lib/desk/applications";
import { slugify } from "../../../../lib/cover-letter";
import styles from "../../../../components/desk/page-applications-index.module.css";
import { useDeskRequest } from "../../../../lib/desk/request";

const COLUMNS: DeskTableColumn<ApplicationRecord>[] = [
  {
    id: "application",
    header: "application",
    primary: true,
    cell: (application) => (
      <span class={styles.application}>
        <span class={styles.application__name}>{applicationName(application)}</span>
        <Show when={application.note !== ""}>
          <span class="desk-note">{application.note}</span>
        </Show>
      </span>
    ),
    sort: (application) => applicationName(application),
    search: (application) =>
      `${application.company} ${application.jobTitle} ${application.location} ${application.note}`,
  },
  {
    id: "status",
    header: "status",
    cell: (application) => (
      <span class={`desk-status desk-status--${statusTone(application.status).tone}`}>
        {statusTone(application.status).text}
      </span>
    ),
    sort: (application) => APPLICATION_STATUSES.indexOf(application.status),
  },
  {
    id: "next",
    header: "next step",
    cell: (application) => (
      <span class={["desk-status", { "desk-status--warn": isDue(application) }]}>
        {nextStepText(application) || "–"}
      </span>
    ),
    // Only open applications have a next step; the soonest first.
    sort: (application) => (nextStepText(application) === "" ? "" : application.nextStepOn),
  },
  {
    id: "applied",
    header: "applied",
    cell: (application) =>
      application.appliedOn === "" ? "–" : formatDay(application.appliedOn, "en"),
    sort: (application) => application.appliedOn,
    firstDirection: "desc",
  },
];

const FILTERS: DeskTableFilter<ApplicationRecord>[] = [
  {
    id: "status",
    label: "status",
    options: APPLICATION_STATUSES.map((status) => ({
      value: status,
      label: STATUS_LABELS[status],
    })),
    value: (application) => application.status,
  },
  {
    id: "source",
    label: "source",
    options: APPLICATION_SOURCES.map((source) => ({
      value: source,
      label: SOURCE_LABELS[source],
    })),
    value: (application) => application.source,
  },
];

interface CreateForm {
  id: string;
  company: string;
  jobTitle: string;
  jobUrl: string;
}

const EMPTY_FORM: CreateForm = { id: "", company: "", jobTitle: "", jobUrl: "" };

/** The form for a new application, opened by "?new". */
function CreateApplication() {
  const navigate = useNavigate();
  const request = useDeskRequest();
  const [form, setForm] = createStore<CreateForm>({ ...EMPTY_FORM });
  const generatedId = () => slugify(`${form.company} ${form.jobTitle}`);

  const bind = (key: keyof CreateForm) => ({
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

    const id = form.id.trim() === "" ? generatedId() : form.id.trim();
    const application: Application = {
      id,
      company: form.company,
      jobTitle: form.jobTitle,
      jobUrl: form.jobUrl,
      jobDescription: "",
      location: "",
      workplace: "",
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: "",
      source: "other",
      status: "preparing",
      cvId: "",
      appliedOn: "",
      nextStep: "",
      nextStepOn: "",
      contacts: [],
      events: [],
      note: "",
    };

    if (await request.run(() => saveDeskApplication(application, { create: true }))) {
      navigate(paths.desk.applications(id));
    }
  }

  return (
    <form class={styles.create} onSubmit={(event) => void create(event)}>
      <h2 class={styles.create__title}>New application</h2>

      <div class={styles.create__fields}>
        <label class="field">
          <span class="field__label">company</span>
          <input {...bind("company")} class="input" required placeholder="Acme" />
        </label>

        <label class="field">
          <span class="field__label">job title</span>
          <input {...bind("jobTitle")} class="input" placeholder="Senior Frontend Engineer" />
        </label>

        <label class="field">
          <span class="field__label">url</span>
          <input {...bind("jobUrl")} class="input" type="url" placeholder="https://…" />
          <span class="field__hint">Where the job is posted.</span>
        </label>

        <label class="field">
          <span class="field__label">id</span>
          <input
            {...bind("id")}
            class="input"
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            placeholder={generatedId() === "" ? "acme-frontend" : generatedId()}
          />
          <span class="field__hint">The URL slug. Left empty, it is the one shown here.</span>
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
          {request.busy() ? "Creating…" : "Create application"}
        </button>
        <a href={paths.desk.applications()} class="button button--outline">
          Cancel
        </a>
      </div>
    </form>
  );
}

export default function Applications() {
  const [search] = useSearchParams();
  const applications = createMemo(() => getDeskApplications());
  const creating = () => search.new !== undefined;

  return (
    <div class="desk-page">
      <DeskMeta title="Applications · Desk" />
      <header class="desk-head">
        <div class="desk-head__text">
          <p class="desk-head__path">~/desk/applications</p>
          <h1 class="desk-head__title">Applications</h1>
          <p class="desk-head__sub">Each job applied for, where it stands and what comes next.</p>
        </div>

        <Show when={!creating()}>
          <a href={paths.desk.applications({ new: "1" })} class="button button--primary">
            <IconPlus size={16} />
            New application
          </a>
        </Show>
      </header>

      <Show when={creating()}>
        <CreateApplication />
      </Show>

      <Show
        when={applications().length > 0}
        fallback={
          <Show when={!creating()}>
            <p class="panel panel__empty">No applications yet.</p>
          </Show>
        }
      >
        <DeskTable
          title="applications"
          noun={["application", "applications"]}
          rows={applications()}
          rowKey={(application) => application.id}
          rowHref={(application) => paths.desk.applications(application.id)()}
          initialSort={{ column: "next", direction: "asc" }}
          columns={COLUMNS}
          filters={FILTERS}
        />
      </Show>
    </div>
  );
}

export const route = {
  preload: () => {
    void getDeskApplications();
  },
} satisfies RouteDefinition;
