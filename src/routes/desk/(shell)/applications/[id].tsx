import {
  APPLICATION_SOURCES,
  APPLICATION_STATUSES,
  SOURCE_LABELS,
  STATUS_LABELS,
} from "../../../../data/applications";
import type { Application, ApplicationRecord } from "../../../../data/applications";
import { For, Show, createMemo, createSignal, snapshot } from "solid-js";
import { IconPlus, IconSend, IconTrash } from "../../../../components/icons";
import { applicationName, statusTone, today } from "../../../../lib/application";
import {
  deleteDeskApplication,
  markDeskApplicationSent,
  saveDeskApplication,
} from "../../../../lib/desk/applications";
import { getDeskApplications, getDeskCvs } from "../../../../lib/desk/queries";
import { useNavigate, useParams } from "@solidjs/router";
import { fromTermsForm, toTermsForm } from "../../../../lib/posting";
import { DeskFormSection } from "../../../../components/desk/DeskFormSection";
import { DeskJobTerms } from "../../../../components/desk/DeskJobTerms";
import type { JobTermsForm } from "../../../../lib/posting";
import { DeskMenu } from "../../../../components/desk/DeskMenu";
import { DeskMeta } from "../../../../components/desk/DeskMeta";
import { DeskSaveBar } from "../../../../components/desk/DeskSaveBar";
import type { RouteDefinition } from "@solidjs/router";
import {
  deskCvPdfPath,
  deskSentCvPdfPath,
  deskSentLetterPdfPath,
} from "../../../../data/endpoints";
import { formatRelative } from "../../../../lib/format";
import { paths } from "../../../../router";
import styles from "../../../../components/desk/page-applications-id.module.css";
import { useDeskRequest } from "../../../../lib/desk/request";
import { useDraft } from "../../../../lib/desk/draft";

/** The application as its form holds it; workplace and salary as in JobTermsForm. */
type ApplicationForm = Omit<Application, keyof JobTermsForm> & JobTermsForm;

/** The form's state: the application without what the list adds, its lists copied. */
function toForm(application: Application): ApplicationForm {
  return {
    id: application.id,
    company: application.company,
    jobTitle: application.jobTitle,
    jobUrl: application.jobUrl,
    jobDescription: application.jobDescription,
    location: application.location,
    ...toTermsForm(application),
    source: application.source,
    status: application.status,
    cvId: application.cvId,
    appliedOn: application.appliedOn,
    nextStep: application.nextStep,
    nextStepOn: application.nextStepOn,
    contacts: application.contacts.map((contact) => ({ ...contact })),
    events: application.events.map((event) => ({ ...event })),
    note: application.note,
  };
}

const EMPTY_FORM: ApplicationForm = toForm({
  id: "",
  company: "",
  jobTitle: "",
  jobUrl: "",
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
});

type TextKey =
  | "company"
  | "jobTitle"
  | "jobUrl"
  | "jobDescription"
  | "location"
  | "appliedOn"
  | "nextStep"
  | "nextStepOn"
  | "note";

type FieldElement = HTMLInputElement | HTMLTextAreaElement;

/** An id of the form "prefix-N" that no item of the list has. */
function freeId(prefix: string, items: { id: string }[]): string {
  const taken = new Set(items.map((item) => item.id));
  let number = items.length + 1;

  while (taken.has(`${prefix}-${number}`)) {
    number += 1;
  }

  return `${prefix}-${number}`;
}

export default function ApplicationEditor() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const applications = createMemo(() => getDeskApplications());
  const cvs = createMemo(() => getDeskCvs());
  const [removing, setRemoving] = createSignal(false);
  // While deleting, the refetched list no longer has it: keep showing the
  // last one until the page has navigated away.
  const stored = createMemo((previous?: ApplicationRecord) => {
    const application = applications().find((candidate) => candidate.id === params.id);

    if (application !== undefined) {
      return application;
    }

    if (removing() && previous !== undefined) {
      return previous;
    }

    throw Object.assign(new Error(`No application "${params.id}".`), { status: 404 });
  });
  const { form, setForm, saved, dirty, reset, leave } = useDraft(
    () => toForm(stored()),
    EMPTY_FORM,
  );
  const request = useDeskRequest();
  const linkedCv = () => cvs().cvs.find((cv) => cv.id === form.cvId);

  const bind = (key: TextKey) => ({
    value: form[key],
    onInput: (event: InputEvent & { currentTarget: FieldElement }) => {
      const { value } = event.currentTarget;

      setForm((draft) => {
        draft[key] = value;
      });
    },
  });

  async function save(event: SubmitEvent) {
    event.preventDefault();
    const draft = snapshot(form);

    await request.run(() =>
      saveDeskApplication({ ...draft, ...fromTermsForm(draft) }, { create: false }),
    );
  }

  /** Freezes the CV and letters as they print now; unsaved changes would be left out. */
  async function markSent() {
    if (dirty()) {
      alert("Save or discard your changes first.");

      return;
    }

    if (
      stored().sent !== null &&
      !confirm("Replace the copy kept when you sent it with how it prints now?")
    ) {
      return;
    }

    await request.run(() => markDeskApplicationSent(params.id));
  }

  async function remove() {
    const withLetter = stored().letter === null ? "" : " and its cover letter";

    if (!confirm(`Delete the application "${applicationName(saved())}"${withLetter}?`)) {
      return;
    }

    setRemoving(true);

    if (await request.run(() => deleteDeskApplication(params.id))) {
      leave();
      navigate(paths.desk.applications());
    } else {
      setRemoving(false);
    }
  }

  return (
    <form class="desk-page" onSubmit={(event) => void save(event)}>
      <DeskMeta title={`${applicationName(saved())} · Applications · Desk`} />
      <header class="desk-head">
        <div class="desk-head__text">
          <p class="desk-head__path">
            <a href={paths.desk.applications()}>~/desk/applications</a> / {params.id}
          </p>
          <h1 class="desk-head__title">{applicationName(form) || params.id}</h1>
          <p class="desk-head__sub">
            <span class={`desk-status desk-status--${statusTone(saved().status).tone}`}>
              {statusTone(saved().status).text}
            </span>
          </p>
        </div>

        <DeskMenu
          label="Application actions"
          actions={[{ label: "Delete", icon: IconTrash, run: () => void remove(), danger: true }]}
        />
      </header>

      <Show when={request.error() !== "" && !dirty()}>
        <p class="desk-error" role="alert">
          {request.error()}
        </p>
      </Show>

      <div class="panels">
        <DeskFormSection title="status" description="Where it stands and what comes next.">
          <label class="field">
            <span class="field__label">status</span>
            {/* `selected` on the options: see the CV select in /desk/cvs. */}
            <select
              class="input"
              onChange={(event) => {
                const status = APPLICATION_STATUSES.find(
                  (option) => option === event.currentTarget.value,
                );

                if (status !== undefined) {
                  setForm((draft) => {
                    draft.status = status;

                    // Sending it is usually today.
                    if (status === "applied" && draft.appliedOn === "") {
                      draft.appliedOn = today();
                    }
                  });
                }
              }}
            >
              <For each={APPLICATION_STATUSES}>
                {(status) => (
                  <option value={status} selected={status === form.status}>
                    {STATUS_LABELS[status]}
                  </option>
                )}
              </For>
            </select>
          </label>
          <label class="field">
            <span class="field__label">applied on</span>
            <input {...bind("appliedOn")} class="input" type="date" />
          </label>
          <label class="field">
            <span class="field__label">next step</span>
            <input {...bind("nextStep")} class="input" placeholder="Follow up, send the task…" />
          </label>
          <label class="field">
            <span class="field__label">by</span>
            <input {...bind("nextStepOn")} class="input" type="date" />
            <span class="field__hint">The overview lists it once this day has come.</span>
          </label>
          <label class="field field--wide">
            <span class="field__label">note</span>
            <textarea {...bind("note")} class="input" rows="2" />
          </label>
        </DeskFormSection>

        <DeskFormSection title="job" description="The role, kept also after the ad goes offline.">
          <label class="field">
            <span class="field__label">company</span>
            <input {...bind("company")} class="input" required />
          </label>
          <label class="field">
            <span class="field__label">job title</span>
            <input {...bind("jobTitle")} class="input" />
          </label>
          <label class="field">
            <span class="field__label">location</span>
            <input {...bind("location")} class="input" placeholder="Berlin, Munich…" />
          </label>
          <DeskJobTerms
            terms={form}
            onChange={(patch) => {
              setForm((draft) => {
                Object.assign(draft, patch);
              });
            }}
          />
          <label class="field">
            <span class="field__label">source</span>
            <select
              class="input"
              onChange={(event) => {
                const source = APPLICATION_SOURCES.find(
                  (option) => option === event.currentTarget.value,
                );

                if (source !== undefined) {
                  setForm((draft) => {
                    draft.source = source;
                  });
                }
              }}
            >
              <For each={APPLICATION_SOURCES}>
                {(source) => (
                  <option value={source} selected={source === form.source}>
                    {SOURCE_LABELS[source]}
                  </option>
                )}
              </For>
            </select>
            <span class="field__hint">How the application reached them.</span>
          </label>
          <label class="field field--wide">
            <span class="field__label">url</span>
            <input {...bind("jobUrl")} class="input" type="url" placeholder="https://…" />
            <Show when={stored().postingId}>
              {(postingId) => (
                <span class="field__hint">
                  Made from{" "}
                  <a href={paths.desk.postings(postingId())} class="text-link">
                    a posting
                  </a>
                  .
                </span>
              )}
            </Show>
          </label>
          <label class="field field--wide">
            <span class="field__label">description</span>
            <textarea
              {...bind("jobDescription")}
              class="input"
              rows="6"
              placeholder="The ad, kept here to write against."
            />
          </label>
        </DeskFormSection>

        <DeskFormSection
          title="contacts"
          description="Recruiters and people at the company."
          single
        >
          <Show when={form.contacts.length > 0}>
            <ul class="form-rows">
              <For each={form.contacts}>
                {(contact, index) => {
                  const set =
                    (key: "name" | "role" | "email" | "phone") =>
                    (event: InputEvent & { currentTarget: HTMLInputElement }) => {
                      const { value } = event.currentTarget;

                      setForm((draft) => {
                        const row = draft.contacts[index()];

                        if (row !== undefined) {
                          row[key] = value;
                        }
                      });
                    };

                  return (
                    <li class={styles["contact-row"]}>
                      <div class={styles["contact-row__fields"]}>
                        <input
                          value={contact.name}
                          onInput={set("name")}
                          class="input"
                          placeholder="Name"
                          aria-label="Name"
                          required
                        />
                        <input
                          value={contact.role}
                          onInput={set("role")}
                          class="input"
                          placeholder="Role, e.g. Recruiter"
                          aria-label="Role"
                        />
                        <input
                          value={contact.email}
                          onInput={set("email")}
                          class="input"
                          type="email"
                          placeholder="Email"
                          aria-label="Email"
                        />
                        <input
                          value={contact.phone}
                          onInput={set("phone")}
                          class="input"
                          type="tel"
                          placeholder="Phone"
                          aria-label="Phone"
                        />
                      </div>
                      <button
                        type="button"
                        class="icon-button"
                        aria-label="Remove contact"
                        title="Remove contact"
                        onClick={() => {
                          setForm((draft) => {
                            draft.contacts.splice(index(), 1);
                          });
                        }}
                      >
                        <IconTrash size={16} />
                      </button>
                    </li>
                  );
                }}
              </For>
            </ul>
          </Show>
          <button
            type="button"
            class={["button button--outline", styles["add-button"]]}
            onClick={() => {
              setForm((draft) => {
                draft.contacts.push({
                  id: freeId("contact", draft.contacts),
                  name: "",
                  role: "",
                  email: "",
                  phone: "",
                });
              });
            }}
          >
            <IconPlus size={16} />
            Add contact
          </button>
        </DeskFormSection>

        <DeskFormSection
          title="history"
          description="Calls, interviews, replies. Sorted by date on save."
          single
        >
          <Show when={form.events.length > 0}>
            <ul class="form-rows">
              <For each={form.events}>
                {(entry, index) => {
                  const set =
                    (key: "date" | "text") =>
                    (event: InputEvent & { currentTarget: HTMLInputElement }) => {
                      const { value } = event.currentTarget;

                      setForm((draft) => {
                        const row = draft.events[index()];

                        if (row !== undefined) {
                          row[key] = value;
                        }
                      });
                    };

                  return (
                    <li class={styles["event-row"]}>
                      <input
                        value={entry.date}
                        onInput={set("date")}
                        class="input"
                        type="date"
                        aria-label="Date"
                        required
                      />
                      <input
                        value={entry.text}
                        onInput={set("text")}
                        class={["input", styles["event-row__text"]]}
                        placeholder="First call with the recruiter"
                        aria-label="What happened"
                        required
                      />
                      <button
                        type="button"
                        class="icon-button"
                        aria-label="Remove entry"
                        title="Remove entry"
                        onClick={() => {
                          setForm((draft) => {
                            draft.events.splice(index(), 1);
                          });
                        }}
                      >
                        <IconTrash size={16} />
                      </button>
                    </li>
                  );
                }}
              </For>
            </ul>
          </Show>
          <button
            type="button"
            class={["button button--outline", styles["add-button"]]}
            onClick={() => {
              setForm((draft) => {
                draft.events.push({ id: freeId("event", draft.events), date: today(), text: "" });
              });
            }}
          >
            <IconPlus size={16} />
            Add entry
          </button>
        </DeskFormSection>

        <DeskFormSection title="documents" description="What you send with it.">
          <label class="field">
            <span class="field__label">cv</span>
            <select
              class="input"
              onChange={(event) => {
                const { value } = event.currentTarget;

                setForm((draft) => {
                  draft.cvId = value;
                });
              }}
            >
              <option value="" selected={form.cvId === ""}>
                None
              </option>
              <For each={cvs().cvs}>
                {(cv) => (
                  <option value={cv.id} selected={cv.id === form.cvId}>
                    {cv.label}
                  </option>
                )}
              </For>
            </select>
            <span class="field__hint">
              <Show when={linkedCv()} fallback="The CV you send with it.">
                {(cv) => (
                  <a href={deskCvPdfPath(cv().id)} class="text-link" target="_blank">
                    Open the CV
                  </a>
                )}
              </Show>
            </span>
          </label>
          <div class="field">
            <span class="field__label">cover letter</span>
            <Show
              when={stored().letter}
              fallback={
                <>
                  <p class={styles.none}>No cover letter.</p>
                  <a
                    href={paths.desk["cover-letters"]({ new: "1", application: params.id })}
                    class={["button button--outline", styles["add-button"]]}
                  >
                    <IconPlus size={16} />
                    Write a letter
                  </a>
                </>
              }
            >
              {(letter) => (
                <a href={paths.desk["cover-letters"](letter().id)} class="text-link">
                  {letter().label}
                </a>
              )}
            </Show>
          </div>
        </DeskFormSection>

        <DeskFormSection
          title="sent"
          description="The CV and letter as they printed when you sent them."
          single
        >
          <Show
            when={stored().sent}
            fallback={
              <p class={styles.none}>
                Not marked as sent. Marking it keeps a copy of the CV and letter as they print now,
                whatever changes later.
              </p>
            }
          >
            {(sent) => (
              <Show
                when={sent().sentAt !== ""}
                fallback={
                  <p class={styles.none}>
                    The stored copy no longer fits what the desk renders. Mark it as sent again to
                    keep a new one.
                  </p>
                }
              >
                <p>Sent {formatRelative(sent().sentAt)}.</p>
                <ul class={styles.letters}>
                  <Show when={sent().hasCv}>
                    <li>
                      <a href={deskSentCvPdfPath(params.id)} class="text-link" target="_blank">
                        CV as sent
                      </a>
                    </li>
                  </Show>
                  <For each={sent().letters}>
                    {(letter) => (
                      <li>
                        <a
                          href={deskSentLetterPdfPath(params.id, letter.id)}
                          class="text-link"
                          target="_blank"
                        >
                          {letter.label} as sent
                        </a>
                      </li>
                    )}
                  </For>
                </ul>
              </Show>
            )}
          </Show>
          <button
            type="button"
            class={["button button--outline", styles["add-button"]]}
            disabled={request.busy()}
            onClick={() => void markSent()}
          >
            <IconSend size={16} />
            {stored().sent === null ? "Mark as sent" : "Mark as sent again"}
          </button>
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
    void getDeskApplications();
    void getDeskCvs();
  },
} satisfies RouteDefinition;
