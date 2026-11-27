import "server-only";
import { Clock, Effect, Result } from "effect";
import { fillAdTextsEffect } from "./ad-texts";
import type { AdTextRun } from "./ad-texts";
import { runDueCollectorsEffect } from "./collector-store";
import type { DueRun } from "./collector-store";
import { checkCompaniesEffect } from "./company-check";
import type { CompanyCheckRun } from "./company-check";
import { listCoverLettersEffect } from "./cover-letters";
import { listCvsEffect } from "./cvs";
import { storedPagesEffect } from "./desk-cvs";
import { letterPagesEffect } from "./desk-letters";
import {
  type AppError,
  type ConfigError,
  type Database,
  type DatabaseError,
  NotFoundError,
  UnauthorizedError,
  runServerEffect,
} from "./effect";
import { scorePostingsEffect } from "./posting-score";
import type { ScoreRun } from "./posting-score";
import { serverSessionCookieEffect } from "./session";
import { timingSafeEqual } from "node:crypto";
import { env } from "virtual:solid-env/server";

// The scheduled page check: reads the company job boards that are due (see
// collector-store.ts), describes the postings' new companies (see
// company-check.ts), finds the text of ads that came without one (see
// ad-texts.ts), scores the postings due for it (see posting-score.ts),
// then measures every CV and cover letter that
// has no page check on this build (all of them after a deploy, and any written
// straight to the database), without anyone opening the desk. Vercel Cron
// calls it with CRON_SECRET; it is the one desk endpoint without requireUser().

/** Starts no further check after this long, so a run ends inside the function's 60 s. */
const BUDGET_MS = 40_000;

/** Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. Unset, the endpoint doesn't exist. */
function requireCronEffect(
  request: Request,
): Effect.Effect<void, NotFoundError | UnauthorizedError> {
  return Effect.gen(function* () {
    const secret = env.CRON_SECRET;

    if (secret === undefined) {
      return yield* new NotFoundError({ message: "Not found." });
    }

    const given = Buffer.from(request.headers.get("authorization") ?? "");
    const expected = Buffer.from(`Bearer ${secret}`);

    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
      return yield* new UnauthorizedError({ message: "Unauthorized." });
    }

    return undefined;
  });
}

interface PageCheckRun {
  /** The job boards read in this run; see collector-store.ts. */
  collectors: DueRun;
  /** The companies described from free sources in this run; see company-check.ts. */
  companies: CompanyCheckRun;
  /** Ad texts found on company boards in this run; see ad-texts.ts. */
  texts: AdTextRun;
  /** The postings scored in this run; see posting-score.ts. */
  scores: ScoreRun;
  /** e.g. "cv/frontend", "letter/acme-frontend". */
  checked: string[];
  failed: { name: string; error: string }[];
  /** Out of time; the next run takes them. */
  left: string[];
}

interface Job {
  name: string;
  run: () => Effect.Effect<unknown, AppError, Database>;
}

function runPageCheckJobEffect(
  request: Request,
): Effect.Effect<
  PageCheckRun,
  NotFoundError | UnauthorizedError | DatabaseError | ConfigError,
  Database
> {
  return Effect.gen(function* () {
    yield* requireCronEffect(request);

    const started = yield* Clock.currentTimeMillis;
    // Chrome prints desk pages, which need a session; the server seals one for
    // the desk's own account, and only Chrome gets it.
    const cookie = yield* serverSessionCookieEffect(request, {
      githubId: env.DESK_GITHUB_USER_ID,
      login: "page-check",
      avatarUrl: "",
    });
    const chrome = new Request(request.url, { headers: { cookie } });
    const [{ cvs, primaryId }, letters] = yield* Effect.all(
      [listCvsEffect(), listCoverLettersEffect()],
      { concurrency: "unbounded" },
    );
    const jobs: Job[] = [
      ...cvs
        .filter((cv) => cv.pageFills.length === 0)
        .map((cv) => ({
          name: `cv/${cv.id}`,
          run: () => storedPagesEffect(chrome, cv, primaryId),
        })),
      ...letters
        .filter((letter) => letter.pageFills.length === 0)
        .map((letter) => ({
          name: `letter/${letter.id}`,
          run: () => letterPagesEffect(chrome, letter.id),
        })),
    ];
    // Job boards first, then the companies of what they found: both quick, and
    // the pages get what time is left.
    const boards = yield* runDueCollectorsEffect({ deadline: started + 10_000 });
    const companies = yield* checkCompaniesEffect({ deadline: started + 22_000 });
    // The text of ads that came without one, so the scores read it.
    const texts = yield* fillAdTextsEffect({ deadline: started + 28_000 });
    // Then scores for what came in, while no page waits for Chrome: a call
    // takes 10–20 s, and the function ends after 60 s.
    const scores = yield* scorePostingsEffect({
      deadline: started + (jobs.length === 0 ? 55_000 : 30_000),
    });
    const result: PageCheckRun = {
      collectors: boards,
      companies,
      texts,
      scores,
      checked: [],
      failed: [],
      left: [],
    };

    // One at a time on purpose: each check renders a PDF with Chrome.
    yield* Effect.forEach(
      jobs,
      (job) =>
        Effect.gen(function* () {
          const now = yield* Clock.currentTimeMillis;

          if (now - started > BUDGET_MS) {
            result.left.push(job.name);

            return;
          }

          const outcome = yield* Effect.result(job.run());

          if (Result.isSuccess(outcome)) {
            result.checked.push(job.name);
          } else {
            result.failed.push({
              name: job.name,
              error: outcome.failure.message,
            });
          }
        }),
      { concurrency: 1, discard: true },
    );

    return result;
  });
}

async function checkMissingPages(request: Request): Promise<PageCheckRun> {
  return runServerEffect(runPageCheckJobEffect(request));
}

export { checkMissingPages, requireCronEffect, runPageCheckJobEffect };
export type { PageCheckRun };
