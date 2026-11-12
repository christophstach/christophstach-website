import { COLLECTOR_TYPE_LABELS } from "../../../../data/postings";
import type { Collector } from "../../../../data/postings";
import { Show, createMemo, createSignal, onCleanup, snapshot } from "solid-js";
import {
  deleteDeskCollector,
  renewDeskCollectorSecret,
  rereadDeskCollector,
  updateDeskCollector,
} from "../../../../lib/desk/postings";
import { forgetSecret, secretOf, showSecret } from "../../../../lib/desk/collector-secret";
import { getRequestEvent, isServer } from "@solidjs/web";
import { useNavigate, useParams } from "@solidjs/router";
import { IconRefresh, IconTrash } from "../../../../components/icons";
import { DeskFormSection } from "../../../../components/desk/DeskFormSection";
import { DeskMenu } from "../../../../components/desk/DeskMenu";
import { DeskMeta } from "../../../../components/desk/DeskMeta";
import { DeskSaveBar } from "../../../../components/desk/DeskSaveBar";
import type { RouteDefinition } from "@solidjs/router";
import { collectorEndpointPath } from "../../../../data/endpoints";
import { formatRelative } from "../../../../lib/format";
import { getDeskCollectors } from "../../../../lib/desk/queries";
import { paths } from "../../../../router";
import styles from "../../../../components/desk/page-postings.module.css";
import { useDeskRequest } from "../../../../lib/desk/request";
import { useDraft } from "../../../../lib/desk/draft";

interface CollectorForm {
  id: string;
  label: string;
  active: boolean;
}

const EMPTY_FORM: CollectorForm = { id: "", label: "", active: true };

/** The site's own origin, on the server from the request. */
function origin(): string {
  if (isServer) {
    const url = getRequestEvent()?.request.url;

    return url === undefined ? "" : new URL(url).origin;
  }

  return location.origin;
}

export default function CollectorEditor() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const collectors = createMemo(() => getDeskCollectors());
  const [removing, setRemoving] = createSignal(false);
  const [notice, setNotice] = createSignal("");
  // While deleting, the refetched list no longer has it: keep the last one.
  const stored = createMemo((previous?: Collector) => {
    const collector = collectors().find((candidate) => candidate.id === params.id);

    if (collector !== undefined) {
      return collector;
    }

    if (removing() && previous !== undefined) {
      return previous;
    }

    throw Object.assign(new Error(`No collector "${params.id}".`), { status: 404 });
  });
  const { form, setForm, saved, dirty, reset, leave } = useDraft(
    () => ({ id: stored().id, label: stored().label, active: stored().active }),
    EMPTY_FORM,
  );
  const request = useDeskRequest();
  const secret = () => secretOf(params.id);
  const endpoint = () => `${origin()}${collectorEndpointPath(params.id)}`;

  // The secret shows on this visit only.
  onCleanup(forgetSecret);

  async function save(event: SubmitEvent) {
    event.preventDefault();

    const { label, active } = snapshot(form);

    await request.run(() => updateDeskCollector(params.id, { label: label.trim(), active }));
  }

  async function renew() {
    if (
      !confirm(
        "Make a new secret? The old one stops working at once: the script needs the new one.",
      )
    ) {
      return;
    }

    let fresh = "";

    if (
      await request.run(async () => {
        fresh = await renewDeskCollectorSecret(params.id);
      })
    ) {
      showSecret(params.id, fresh);
    }
  }

  async function reread() {
    let count = 0;

    setNotice("");

    if (
      await request.run(async () => {
        count = await rereadDeskCollector(params.id);
      })
    ) {
      setNotice(
        `Read ${count} ${count === 1 ? "posting" : "postings"} again: their title, company and location are the mail's again, and so are workplace and salary where it states them.`,
      );
    }
  }

  async function remove() {
    if (!confirm(`Delete the collector "${saved().label}"? Its postings stay, as added by hand.`)) {
      return;
    }

    setRemoving(true);

    if (await request.run(() => deleteDeskCollector(params.id))) {
      leave();
      navigate(paths.desk.collectors());
    } else {
      setRemoving(false);
    }
  }

  return (
    <form class="desk-page" onSubmit={(event) => void save(event)}>
      <DeskMeta title={`${saved().label} · Collectors · Desk`} />
      <header class="desk-head">
        <div class="desk-head__text">
          <p class="desk-head__path">
            <a href={paths.desk.collectors()}>~/desk/collectors</a> / {params.id}
          </p>
          <h1 class="desk-head__title">{form.label || params.id}</h1>
          <p class="desk-head__sub">{COLLECTOR_TYPE_LABELS[stored().type].name}</p>
        </div>

        <DeskMenu
          label="Collector actions"
          actions={[
            { label: "Read again", icon: IconRefresh, run: () => void reread() },
            { label: "New secret", icon: IconRefresh, run: () => void renew() },
            { label: "Delete", icon: IconTrash, run: () => void remove(), danger: true },
          ]}
        />
      </header>

      <Show when={request.error() !== "" && !dirty()}>
        <p class="desk-error" role="alert">
          {request.error()}
        </p>
      </Show>
      <Show when={notice()}>
        <p class={styles.hint} role="status">
          {notice()}
        </p>
      </Show>

      <div class="panels">
        <DeskFormSection
          title="setup"
          description="Where the collector sends, and how it signs in."
        >
          <div class="field field--wide">
            <span class="field__label">address</span>
            <p class={styles.secret}>{endpoint()}</p>
            <span class="field__hint">
              It takes a POST with the secret as <code>Authorization: Bearer …</code>.
            </span>
          </div>
          <div class="field field--wide">
            <span class="field__label">secret</span>
            <Show
              when={secret()}
              fallback={
                <span class="field__hint">
                  Shown once, when it's made; the desk keeps only its hash. Lost it? Make a new one
                  from the menu.
                </span>
              }
            >
              {(value) => (
                <>
                  <p class={styles.secret}>{value()}</p>
                  <span class="field__hint">
                    Copy it now: it won't show again once you leave this page.
                  </span>
                </>
              )}
            </Show>
          </div>
          <Show when={stored().type === "linkedin-email"}>
            <div class="field field--wide">
              <span class="field__label">in gmail</span>
              <ol class={styles.steps}>
                <li>
                  Open{" "}
                  <a href="https://script.google.com" class="text-link">
                    script.google.com
                  </a>{" "}
                  signed in to the Gmail account that gets the alerts, and make a new project.
                </li>
                <li>Paste tools/linkedin-alerts.gs from the website's repository into it.</li>
                <li>
                  Under Project Settings → Script Properties, add <code>DESK_ENDPOINT</code> with
                  the address above and <code>DESK_SECRET</code> with the secret.
                </li>
                <li>
                  Run <code>install</code> once and allow access to Gmail. It sends new alert mails
                  every hour and labels the sent ones <code>desk/collected</code>.
                </li>
              </ol>
            </div>
          </Show>
        </DeskFormSection>

        <DeskFormSection title="collector" description="Its name, and whether it takes postings.">
          <label class="field">
            <span class="field__label">name</span>
            <input
              value={form.label}
              onInput={(event) => {
                const { value } = event.currentTarget;

                setForm((draft) => {
                  draft.label = value;
                });
              }}
              class="input"
              required
            />
          </label>
          <label class="field">
            <span class="field__label">active</span>
            <span>
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => {
                  const { checked } = event.currentTarget;

                  setForm((draft) => {
                    draft.active = checked;
                  });
                }}
              />{" "}
              Takes postings; a paused one turns them away.
            </span>
          </label>
          <dl class={["field", "field--wide", styles.facts]}>
            <dt>last run</dt>
            <dd>{stored().lastRunAt === "" ? "never" : formatRelative(stored().lastRunAt)}</dd>
            <dt>found</dt>
            <dd>
              {stored().lastFound} in the last run, {stored().lastAdded} new
            </dd>
            <dt>postings</dt>
            <dd>
              <a href={paths.desk.postings()} class="text-link">
                {stored().postings} in all
              </a>
            </dd>
            <Show when={stored().lastError}>
              {(error) => (
                <>
                  <dt>error</dt>
                  <dd>
                    <span class="desk-status desk-status--warn">{error()}</span>
                  </dd>
                </>
              )}
            </Show>
          </dl>
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
    void getDeskCollectors();
  },
} satisfies RouteDefinition;
