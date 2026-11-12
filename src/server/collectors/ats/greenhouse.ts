import "server-only";
import { array, exactOptional, looseObject, nullable, number, safeParse, string } from "zod/mini";
import type { AtsReader } from "./types";
import { boardPosting, isoDay, workplaceInLocation } from "./types";
import { decodeEntities, htmlToText } from "../text";
import type { AtsBoard } from "../../../data/postings";
import type { FoundPosting } from "../types";
import { HttpError } from "../../http";
import type { output } from "zod/mini";
import { fetchBoardJson } from "./fetch";

// Greenhouse's job board API: boards-api.greenhouse.io/v1/boards/<board>/jobs.
// content=true adds each job's text, as HTML escaped once more. It states no
// workplace or salary of its own: the location may say "Remote".

const jobSchema = looseObject({
  id: number(),
  title: string(),
  absolute_url: string(),
  location: exactOptional(nullable(looseObject({ name: exactOptional(nullable(string())) }))),
  first_published: exactOptional(nullable(string())),
  updated_at: exactOptional(nullable(string())),
  company_name: exactOptional(nullable(string())),
  content: exactOptional(nullable(string())),
});

const boardSchema = looseObject({ jobs: array(jobSchema) });

function toPosting(job: output<typeof jobSchema>, board: AtsBoard): FoundPosting {
  const location = (job.location?.name ?? "").trim();

  return {
    ...boardPosting(board, String(job.id)),
    url: job.absolute_url,
    company: board.company || (job.company_name ?? ""),
    title: job.title.trim(),
    location,
    description: htmlToText(decodeEntities(job.content ?? "")),
    postedOn: isoDay(job.first_published ?? job.updated_at ?? undefined),
    workplace: workplaceInLocation(location),
    raw: JSON.stringify(job),
  };
}

const greenhouse: AtsReader = {
  provider: "greenhouse",
  async read(board) {
    const body = await fetchBoardJson(
      `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board.board)}/jobs?content=true`,
      board,
    );
    const parsed = safeParse(boardSchema, body);

    if (!parsed.success) {
      throw new HttpError(502, `Greenhouse's board "${board.board}" no longer reads as expected.`);
    }

    return parsed.data.jobs.map((job) => toPosting(job, board));
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

export { greenhouse };
