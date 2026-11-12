import "server-only";
import {
  array,
  boolean,
  exactOptional,
  looseObject,
  nullable,
  number,
  safeParse,
  string,
} from "zod/mini";
import type { AtsReader } from "./types";
import { boardPosting, isoDay, joinPlaces, workplaceInLocation, workplaceWord } from "./types";
import type { AtsBoard } from "../../../data/postings";
import type { FoundPosting } from "../types";
import { HttpError } from "../../http";
import { NO_SALARY } from "../salary";
import { SALARY_CURRENCIES } from "../../../data/postings";
import type { Salary } from "../salary";
import { fetchBoardJson } from "./fetch";
import type { output } from "zod/mini";

// Ashby's public job board API:
// api.ashbyhq.com/posting-api/job-board/<board>?includeCompensation=true.
// Each job states its workplace, and its salary where the company shows it.

const componentSchema = looseObject({
  compensationType: exactOptional(nullable(string())),
  interval: exactOptional(nullable(string())),
  currencyCode: exactOptional(nullable(string())),
  minValue: exactOptional(nullable(number())),
  maxValue: exactOptional(nullable(number())),
});

const jobSchema = looseObject({
  id: string(),
  title: string(),
  jobUrl: string(),
  location: exactOptional(nullable(string())),
  secondaryLocations: exactOptional(
    nullable(array(looseObject({ location: exactOptional(nullable(string())) }))),
  ),
  workplaceType: exactOptional(nullable(string())),
  isRemote: exactOptional(nullable(boolean())),
  isListed: exactOptional(nullable(boolean())),
  publishedAt: exactOptional(nullable(string())),
  descriptionPlain: exactOptional(nullable(string())),
  compensation: exactOptional(
    nullable(looseObject({ summaryComponents: exactOptional(nullable(array(componentSchema))) })),
  ),
});

const boardSchema = looseObject({ jobs: array(jobSchema) });

type AshbyJob = output<typeof jobSchema>;

/** What a year has of each interval Ashby states pay per. */
const PER_YEAR: Record<string, number> = { "1 YEAR": 1, "1 MONTH": 12 };

function salaryOf(job: AshbyJob): Salary {
  const salary = (job.compensation?.summaryComponents ?? []).find(
    (component) =>
      component.compensationType === "Salary" && PER_YEAR[component.interval ?? ""] !== undefined,
  );
  const factor = PER_YEAR[salary?.interval ?? ""] ?? 1;
  const min = salary?.minValue ?? null;
  const max = salary?.maxValue ?? null;

  if (salary === undefined || (min === null && max === null)) {
    return NO_SALARY;
  }

  return {
    salaryMin: min === null ? null : Math.round(min * factor),
    salaryMax: max === null ? null : Math.round(max * factor),
    salaryCurrency:
      SALARY_CURRENCIES.find((code) => code === salary.currencyCode?.toUpperCase()) ?? "",
  };
}

function toPosting(job: AshbyJob, board: AtsBoard): FoundPosting {
  const location = joinPlaces([
    job.location ?? undefined,
    ...(job.secondaryLocations ?? []).map((place) => place.location ?? undefined),
  ]);

  return {
    ...boardPosting(board, job.id),
    url: job.jobUrl,
    title: job.title.trim(),
    location,
    description: (job.descriptionPlain ?? "").trim(),
    postedOn: isoDay(job.publishedAt ?? undefined),
    workplace:
      workplaceWord(job.workplaceType ?? undefined) ||
      (job.isRemote === true ? "remote" : workplaceInLocation(location)),
    ...salaryOf(job),
    raw: JSON.stringify(job),
  };
}

const ashby: AtsReader = {
  provider: "ashby",
  async read(board) {
    const body = await fetchBoardJson(
      `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(board.board)}?includeCompensation=true`,
      board,
    );
    const parsed = safeParse(boardSchema, body);

    if (!parsed.success) {
      throw new HttpError(502, `Ashby's board "${board.board}" no longer reads as expected.`);
    }

    // An unlisted job is reachable by its link only: the company doesn't advertise it.
    return parsed.data.jobs
      .filter((job) => job.isListed !== false)
      .map((job) => toPosting(job, board));
  },
  reread(raw, board) {
    try {
      const parsed = safeParse(jobSchema, JSON.parse(raw));

      return parsed.success ? toPosting(parsed.data, board) : undefined;
    } catch {
      return undefined;
    }
  },
};

export { ashby };
