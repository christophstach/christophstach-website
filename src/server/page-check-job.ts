import "server-only";
import { checkCompanies } from "./company-check";
import type { CompanyCheckRun } from "./company-check";
import type { DueRun } from "./collector-store";
import { HttpError } from "./http";
import { env } from "virtual:solid-env/server";
import { letterPages } from "./desk-letters";
import { listCoverLetters } from "./cover-letters";
import { listCvs } from "./cvs";
import { runDueCollectors } from "./collector-store";
import { scorePostings } from "./posting-score";
import type { ScoreRun } from "./posting-score";
import { serverSessionCookie } from "./session";
import { storedPages } from "./desk-cvs";
import { timingSafeEqual } from "node:crypto";

// The scheduled page check: reads the company job boards that are due (see
// collector-store.ts), describes the postings' new companies (see
// company-check.ts), scores the postings due for it (see posting-score.ts),
// then measures every CV and cover letter that
// has no page check on this build (all of them after a deploy, and any written
// straight to the database), without anyone opening the desk. Vercel Cron
// calls it with CRON_SECRET; it is the one desk endpoint without requireUser().

/** Starts no further check after this long, so a run ends inside the function's 60 s. */
const BUDGET_MS = 40_000;

/** Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. Unset, the endpoint doesn't exist. */
function requireCronSecret(request: Request) {
  const secret = env.CRON_SECRET;

  if (secret === undefined) {
    throw new HttpError(404, "Not found.");
  }

  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);

  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    throw new HttpError(401, "Unauthorized.");
  }
}

interface PageCheckRun {
  /** The job boards read in this run; see collector-store.ts. */
  collectors: DueRun;
  /** The companies described from free sources in this run; see company-check.ts. */
  companies: CompanyCheckRun;
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
  run: () => Promise<unknown>;
}

async function checkMissingPages(request: Request): Promise<PageCheckRun> {
  requireCronSecret(request);

  const started = Date.now();
  // Chrome prints desk pages, which need a session; the server seals one for
  // the desk's own account, and only Chrome gets it.
  const cookie = await serverSessionCookie(request, {
    githubId: env.DESK_GITHUB_USER_ID,
    login: "page-check",
    avatarUrl: "",
  });
  const chrome = new Request(request.url, { headers: { cookie } });
  const [{ cvs, primaryId }, letters] = await Promise.all([listCvs(), listCoverLetters()]);
  const jobs: Job[] = [
    ...cvs
      .filter((cv) => cv.pageFills.length === 0)
      .map((cv) => ({
        name: `cv/${cv.id}`,
        run: () => storedPages(chrome, cv, primaryId),
      })),
    ...letters
      .filter((letter) => letter.pageFills.length === 0)
      .map((letter) => ({
        name: `letter/${letter.id}`,
        run: () => letterPages(chrome, letter.id),
      })),
  ];
  // Job boards first, then the companies of what they found: both quick, and
  // the pages get what time is left.
  const boards = await runDueCollectors({ deadline: started + 10_000 });
  const companies = await checkCompanies({ deadline: started + 22_000 });
  // Then scores for what came in: longer while no page waits for Chrome.
  const scores = await scorePostings({ deadline: started + (jobs.length === 0 ? 50_000 : 30_000) });
  const result: PageCheckRun = {
    collectors: boards,
    companies,
    scores,
    checked: [],
    failed: [],
    left: [],
  };

  async function runOne(job: Job) {
    if (Date.now() - started > BUDGET_MS) {
      result.left.push(job.name);

      return;
    }

    try {
      await job.run();
      result.checked.push(job.name);
    } catch (error) {
      result.failed.push({
        name: job.name,
        error: error instanceof Error ? error.message : "Unknown error.",
      });
    }
  }

  // One at a time on purpose: each check renders a PDF with Chrome.
  await jobs.reduce<Promise<void>>(
    (previous, job) => previous.then(() => runOne(job)),
    Promise.resolve(),
  );

  return result;
}

export { checkMissingPages };
export type { PageCheckRun };
