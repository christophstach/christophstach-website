import { Show, createMemo, createSignal } from "solid-js";
import { getDeskJobSearch, getDeskPostings } from "../../../../lib/desk/queries";
import { saveDeskJobSearch, scoreDeskPostings } from "../../../../lib/desk/postings";
import type { DeskScoreRun } from "../../../../lib/desk/postings";
import { DeskFormSection } from "../../../../components/desk/DeskFormSection";
import { DeskMeta } from "../../../../components/desk/DeskMeta";
import { DeskSaveBar } from "../../../../components/desk/DeskSaveBar";
import { IconSparkles } from "../../../../components/icons";
import type { RouteDefinition } from "@solidjs/router";
import { formatRelative } from "../../../../lib/format";
import { FREE_SCORES_PER_DAY, isScoreDue, scoredToday } from "../../../../lib/posting";
import { paths } from "../../../../router";
import styles from "../../../../components/desk/page-postings.module.css";
import { useDeskRequest } from "../../../../lib/desk/request";
import { useDraft } from "../../../../lib/desk/draft";

const PLACEHOLDER = `e.g.
Senior or staff frontend / full-stack roles, TypeScript, React or Solid.
Berlin or remote in Germany; no relocation.
At least €85K a year.
Product companies over agencies; AI and developer tools welcome.
No consulting, no on-call heavy ops roles.`;

export default function Scoring() {
  const search = createMemo(() => getDeskJobSearch());
  const postings = createMemo(() => getDeskPostings());
  const { form, setForm, dirty, reset } = useDraft(
    () => ({ id: "search", notes: search().notes }),
    { id: "search", notes: "" },
  );
  const request = useDeskRequest();
  const [run, setRun] = createSignal<DeskScoreRun>();
  const due = () => postings().filter((posting) => isScoreDue(posting, search().updatedAt)).length;
  const scored = () => postings().filter((posting) => posting.score !== null).length;
  // Ad texts from company boards, for postings that came without one (see ad-texts.ts).
  const textsSearched = () => postings().filter((posting) => posting.adTextCheckedAt !== "").length;
  const textsFound = () => postings().filter((posting) => posting.adTextUrl !== "").length;
  const textsWaiting = () =>
    postings().filter(
      (posting) =>
        posting.description === "" &&
        posting.adTextCheckedAt === "" &&
        posting.status !== "dismissed",
    ).length;

  async function save(event: SubmitEvent) {
    event.preventDefault();
    await request.run(() => saveDeskJobSearch(form.notes));
  }

  async function scoreNow() {
    if (dirty()) {
      alert("Save or discard your notes first: scores use the saved ones.");

      return;
    }

    await request.run(async () => {
      const result = await scoreDeskPostings();

      setRun(result);

      if (result.error !== "") {
        throw new Error(result.error);
      }
    });
  }

  return (
    <form class="desk-page" onSubmit={(event) => void save(event)}>
      <DeskMeta title="Scoring · Postings · Desk" />
      <header class="desk-head">
        <div class="desk-head__text">
          <p class="desk-head__path">
            <a href={paths.desk.postings()}>~/desk/postings</a> / scoring
          </p>
          <h1 class="desk-head__title">Scoring</h1>
          <p class="desk-head__sub">
            A language model scores each posting 0–100 against your CV content and these notes, and
            picks the CV to send.
          </p>
        </div>
      </header>

      <Show when={request.error() !== "" && !dirty()}>
        <p class="desk-error" role="alert">
          {request.error()}
        </p>
      </Show>

      <div class="panels">
        <DeskFormSection
          title="search notes"
          description="What you look for and what you don't, in your own words. They outweigh the CV."
          single
        >
          <label class="field field--wide">
            <span class="field__label">notes</span>
            <textarea
              value={form.notes}
              onInput={(event) => {
                const { value } = event.currentTarget;

                setForm((draft) => {
                  draft.notes = value;
                });
              }}
              class="input"
              rows="10"
              placeholder={PLACEHOLDER}
            />
            <span class="field__hint">
              Role and level, stack, places, salary, kinds of company, deal breakers. Changing them
              makes every score stale: the postings are scored again, newest first.
              <Show when={search().updatedAt}>{(at) => <> Saved {formatRelative(at())}.</>}</Show>
            </span>
          </label>
        </DeskFormSection>

        <DeskFormSection
          title="model"
          description="Runs on OpenRouter, only while it's free at every provider."
          single
        >
          <dl class={["field", styles.facts]}>
            <dt>model</dt>
            <dd>{search().model}</dd>
            <dt>scored</dt>
            <dd>
              {scored()} of {postings().length} postings
            </dd>
            <dt>due</dt>
            <dd>{due()}</dd>
            <dt>today</dt>
            <dd>{`${scoredToday(postings())} of ${FREE_SCORES_PER_DAY} free requests used`}</dd>
            <dt>ad texts</dt>
            <dd>
              found {textsFound()} of {textsSearched()} searched; {textsWaiting()} waiting
            </dd>
          </dl>
          <p class={styles.hint}>
            The scheduled job scores what is due every 15 minutes, one or two at a time, up to 50 a
            day. Set <code>JOB_SCORE_MODEL</code> for another free model. The free model's provider
            may keep what it is sent. Postings that came without the ad's text (LinkedIn's mails)
            are searched for on the company's own job board first, once each.
          </p>
          <div class={styles.actions}>
            <button
              type="button"
              class="button button--outline"
              disabled={request.busy() || due() === 0}
              onClick={() => void scoreNow()}
            >
              <IconSparkles size={16} />
              {request.busy() && !dirty() ? "Scoring…" : "Score now"}
            </button>
          </div>
          <Show when={run()}>
            {(result) => (
              <p class={styles.hint} role="status">
                Scored {result().scored.length}; {result().left} left
                {result().left > 0 ? " for the next run or another click" : ""}.
              </p>
            )}
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
    void getDeskJobSearch();
    void getDeskPostings();
  },
} satisfies RouteDefinition;
