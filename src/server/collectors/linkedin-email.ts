import "server-only";
import type { FoundPosting, PushCollector } from "./types";
import { array, exactOptional, maxLength, object, string } from "zod/mini";
import { tidyLines } from "./text";
import { parseInput } from "../input";

// LinkedIn's job alert mails, as the script in Gmail sends them
// (tools/linkedin-alerts.gs). LinkedIn has no job search API for its
// members; the alerts are the way its jobs reach the desk. A mail lists each
// job as a few lines (title, company, location) and a link to
// linkedin.com/jobs/view/<id>, whose id says which job it is.

const bodySchema = object({
  messages: array(
    object({
      subject: exactOptional(string("A subject is text.")),
      plain: exactOptional(string("A plain body is text.")),
    }),
    "Send { messages: [{ subject, plain }] }.",
  ).check(maxLength(50, "At most 50 messages at a time.")),
});

/** A job's link; the id may follow a slug, e.g. /jobs/view/frontend-at-acme-4012345678. */
const JOB_LINK =
  /https?:\/\/(?:[a-z]{2,3}\.)?(?:www\.)?linkedin\.com\/(?:comm\/)?jobs\/view\/(?:[^/\s?]*-)?(\d{6,})/iu;

const ANY_LINK = /https?:\/\/\S+/u;

/** A line that only separates two jobs. */
const SEPARATOR = /^[-–—_=*·•.\s]{3,}$/u;

/** Lines around a job that aren't its title, company or location. */
const NOISE =
  /^(?:view job|view all|see all|see more|apply|easy apply|actively recruiting|this company is actively hiring|promoted|reposted|new|be an early applicant|your job alert|stand out and let hirers know|\d+\+? new jobs?|jobs? (?:similar|matching|you)|unsubscribe|manage (?:alerts|job alerts)|this email was intended|learn why|you are receiving|help:|linkedin corporation|©|\d+ (?:connections?|alumni|applicants?|school alum)|.* (?:connections?|alumni) works? here|.*\bapplicants?$)/iu;

/**
 * Reads one mail's text. Its plain body lists each job as
 *
 *   Senior Software Engineer (Frontend focused)
 *   GetYourGuide
 *   Berlin
 *   This company is actively hiring
 *   View job: https://www.linkedin.com/comm/jobs/view/4487151455/?trackingId=…
 *   ---------------------------------------------------------
 *
 * after a header line ("Your job alert for …"). Each job link takes the
 * meaningful lines since the last one or the last separator.
 */
function readText(text: string): FoundPosting[] {
  const found = new Map<string, FoundPosting>();
  let lines: string[] = [];

  for (const line of text.split("\n")) {
    const id = JOB_LINK.exec(line)?.[1];

    if (id !== undefined) {
      // Title, company and location come first; extras ("This company is
      // actively hiring", "2 school alumni") may follow them.
      const [title = "", company = "", location = ""] = lines;
      const [companyName = "", place = ""] =
        lines.length === 2 && company.includes(" · ") ? company.split(" · ") : [company, location];
      const known = found.get(id);

      // A job's link may come twice (its title and its button): keep the read with a title.
      if (known === undefined || known.title === "") {
        found.set(id, {
          source: "linkedin",
          externalId: id,
          url: `https://www.linkedin.com/jobs/view/${id}/`,
          title,
          company: companyName,
          location: place,
          description: "",
          postedOn: "",
          raw: text,
        });
      }

      lines = [];
    } else if (SEPARATOR.test(line)) {
      lines = [];
    } else if (line !== "" && !ANY_LINK.test(line) && !NOISE.test(line)) {
      lines.push(line);
    }
  }

  return [...found.values()];
}

const linkedinEmail: PushCollector = {
  type: "linkedin-email",
  read(body) {
    const { messages } = parseInput(bodySchema, body);

    // Only the plain body: the HTML one lays the jobs out differently (a
    // preview text first, salary and workplace lines), and reading it as
    // text mixes them up.
    return messages.flatMap((message) => readText(tidyLines(message.plain ?? "")));
  },
  reread(raw, externalId) {
    return readText(raw).find((posting) => posting.externalId === externalId);
  },
};

export { JOB_LINK, linkedinEmail, readText };
