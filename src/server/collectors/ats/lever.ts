import "server-only";
import { array, exactOptional, looseObject, nullable, number, safeParse, string } from "zod/mini";
import type { AtsReader } from "./types";
import { boardPosting, isoDay, joinPlaces, workplaceInLocation, workplaceWord } from "./types";
import type { AtsBoard } from "../../../data/postings";
import type { FoundPosting } from "../types";
import { HttpError } from "../../http";
import { NO_SALARY } from "../salary";
import type { Salary } from "../salary";
import { SALARY_CURRENCIES } from "../../../data/postings";
import { fetchBoardJson } from "./fetch";
import { htmlToText } from "../text";
import type { output } from "zod/mini";

// Lever's postings API: api.lever.co/v0/postings/<board>?mode=json, or
// api.eu.lever.co for boards hosted in the EU. Each job states its
// workplace, and may state a salary range.

const jobSchema = looseObject({
  id: string(),
  text: string(),
  hostedUrl: string(),
  createdAt: exactOptional(nullable(number())),
  workplaceType: exactOptional(nullable(string())),
  categories: exactOptional(
    nullable(
      looseObject({
        location: exactOptional(nullable(string())),
        allLocations: exactOptional(nullable(array(string()))),
      }),
    ),
  ),
  descriptionPlain: exactOptional(nullable(string())),
  lists: exactOptional(
    nullable(
      array(
        looseObject({
          text: exactOptional(nullable(string())),
          content: exactOptional(nullable(string())),
        }),
      ),
    ),
  ),
  additionalPlain: exactOptional(nullable(string())),
  salaryRange: exactOptional(
    nullable(
      looseObject({
        currency: exactOptional(nullable(string())),
        interval: exactOptional(nullable(string())),
        min: exactOptional(nullable(number())),
        max: exactOptional(nullable(number())),
      }),
    ),
  ),
});

const boardSchema = array(jobSchema);

type LeverJob = output<typeof jobSchema>;

/** What a year has of each interval Lever states a salary per. */
const PER_YEAR: Record<string, number> = { "per-year-salary": 1, "per-month-salary": 12 };

function salaryOf(range: LeverJob["salaryRange"]): Salary {
  const factor = PER_YEAR[range?.interval ?? ""];
  const min = range?.min ?? null;
  const max = range?.max ?? null;

  if (range === undefined || range === null || factor === undefined) {
    return NO_SALARY;
  }

  if ((min === null || min <= 0) && (max === null || max <= 0)) {
    return NO_SALARY;
  }

  return {
    salaryMin: min === null || min <= 0 ? null : Math.round(min * factor),
    salaryMax: max === null || max <= 0 ? null : Math.round(max * factor),
    salaryCurrency: SALARY_CURRENCIES.find((code) => code === range.currency?.toUpperCase()) ?? "",
  };
}

/** The ad's text: its description, then each list under its heading, then the rest. */
function descriptionOf(job: LeverJob): string {
  const lists = (job.lists ?? []).map((list) =>
    [list.text ?? "", htmlToText(list.content ?? "")].filter((part) => part !== "").join("\n"),
  );

  return [job.descriptionPlain ?? "", ...lists, job.additionalPlain ?? ""]
    .map((part) => part.trim())
    .filter((part) => part !== "")
    .join("\n\n");
}

function toPosting(job: LeverJob, board: AtsBoard): FoundPosting {
  const location = joinPlaces(
    job.categories?.allLocations ?? [job.categories?.location ?? undefined],
  );

  return {
    ...boardPosting(board, job.id),
    url: job.hostedUrl,
    title: job.text.trim(),
    location,
    description: descriptionOf(job),
    postedOn: isoDay(job.createdAt ?? undefined),
    workplace: workplaceWord(job.workplaceType ?? undefined) || workplaceInLocation(location),
    ...salaryOf(job.salaryRange),
    raw: JSON.stringify(job),
  };
}

async function fetchJobs(board: AtsBoard): Promise<unknown> {
  const path = `/v0/postings/${encodeURIComponent(board.board)}?mode=json`;

  try {
    return await fetchBoardJson(`https://api.lever.co${path}`, board);
  } catch (error) {
    // Not on the global instance: maybe on the EU one.
    if (error instanceof HttpError && error.status === 404) {
      return fetchBoardJson(`https://api.eu.lever.co${path}`, board);
    }

    throw error;
  }
}

const lever: AtsReader = {
  provider: "lever",
  async read(board) {
    const parsed = safeParse(boardSchema, await fetchJobs(board));

    if (!parsed.success) {
      throw new HttpError(502, `Lever's board "${board.board}" no longer reads as expected.`);
    }

    return parsed.data.map((job) => toPosting(job, board));
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

export { lever };
