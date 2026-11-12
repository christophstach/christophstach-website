import "server-only";
import type { FoundPosting, PushCollector } from "./types";
import { NO_SALARY, readSalary, readWorkplace } from "./salary";
import type { Salary } from "./salary";
import type { Workplace } from "../../data/postings";
import { array, exactOptional, maxLength, object, safeParse, string } from "zod/mini";
import { htmlToText, tidyLines } from "./text";
import { emptyOrMatching, parseInput } from "../input";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u;

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
      html: exactOptional(string("An HTML body is text.")),
      date: exactOptional(emptyOrMatching(ISO_DATE, "A date is YYYY-MM-DD.")),
    }),
    "Send { messages: [{ subject, plain, html, date }] }.",
  ).check(maxLength(50, "At most 50 messages at a time.")),
});

/**
 * What a posting keeps of its mail: both bodies as text, and its day. Older
 * ones kept the plain text alone, or no day.
 */
const rawSchema = object({ plain: string(), html: string(), date: exactOptional(string()) });

/** A mail as the desk reads it: its bodies as text and its day (YYYY-MM-DD), each may be empty. */
interface Mail {
  plain: string;
  html: string;
  date: string;
}

/** A job's link; the id may follow a slug, e.g. /jobs/view/frontend-at-acme-4012345678. */
const JOB_LINK =
  /https?:\/\/(?:[a-z]{2,3}\.)?(?:www\.)?linkedin\.com\/(?:comm\/)?jobs\/view\/(?:[^/\s?]*-)?(\d{6,})/iu;

const ANY_LINK = /https?:\/\/\S+/u;

/** A line that only separates two jobs. */
const SEPARATOR = /^[-–—_=*·•.\s]{3,}$/u;

/** Lines around a job that aren't its title, company or location. */
const NOISE =
  /^(?:view job|view all|see all|see more|apply|easy apply|actively recruiting|this company is actively hiring|promoted|reposted|new|be an early applicant|your job alert|stand out and let hirers know|\d+\+? new jobs?|jobs? (?:similar|matching|you)|unsubscribe|manage (?:alerts|job alerts)|this email was intended|learn why|you are receiving|help:|linkedin corporation|©|\d+ (?:connections?|alumni|applicants?|school alum)|.* (?:connections?|alumni) works? here|.*\bapplicants?$)/iu;

/** Links without their tracking: a job link as its id, any other without its query. */
function compactLinks(text: string): string {
  return text.replaceAll(/https?:\/\/\S+/gu, (url) => {
    const id = JOB_LINK.exec(url)?.[1];

    return id === undefined
      ? url.replace(/[?#].*$/u, "")
      : `https://www.linkedin.com/jobs/view/${id}/`;
  });
}

type Card = Salary & { workplace: Workplace | "" };

/**
 * Reads the workplace and salary of each job from the HTML body, which the
 * plain one leaves out. As text, a job there is its links, then
 *
 *   Senior Full Stack Engineer (m/w/d)
 *   Computer Futures · Seligenstadt (Hybrid)
 *   €60K-€80K / year
 *   Actively recruiting
 *
 * up to the next job's link; any other link ends the job.
 */
function readCards(html: string): Map<string, Card> {
  const cards = new Map<string, Card>();
  let card: Card | undefined;

  for (const line of html.split("\n")) {
    const id = JOB_LINK.exec(line)?.[1];

    if (id !== undefined) {
      card = cards.get(id) ?? { workplace: "", ...NO_SALARY };
      cards.set(id, card);
    } else if (ANY_LINK.test(line)) {
      card = undefined;
    } else if (card !== undefined) {
      const salary = readSalary(line);
      const workplace = line.includes(" · ") ? readWorkplace(line) : "";

      if (workplace !== "" && card.workplace === "") {
        card.workplace = workplace;
      }

      if (salary.salaryMin !== null && card.salaryMin === null) {
        Object.assign(card, salary);
      }
    }
  }

  return cards;
}

/**
 * Reads one mail. Its plain body lists each job as
 *
 *   Senior Software Engineer (Frontend focused)
 *   GetYourGuide
 *   Berlin
 *   This company is actively hiring
 *   View job: https://www.linkedin.com/comm/jobs/view/4487151455/?trackingId=…
 *   ---------------------------------------------------------
 *
 * after a header line ("Your job alert for …"). Each job link takes the
 * meaningful lines since the last one or the last separator. The HTML body,
 * as text, adds each job's workplace and salary (readCards).
 */
function readMail({ plain, html, date }: Mail): FoundPosting[] {
  const raw = html === "" && date === "" ? plain : JSON.stringify({ plain, html, date });
  const cards = readCards(html);
  const found = new Map<string, FoundPosting>();
  let lines: string[] = [];

  for (const line of plain.split("\n")) {
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
          // LinkedIn says no more than that the job is new since the last alert.
          postedOn: date,
          ...(cards.get(id) ?? { workplace: "", ...NO_SALARY }),
          raw,
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

/** A posting's stored mail: both bodies, or the plain one alone. */
function storedMail(raw: string): Mail {
  if (raw.startsWith("{")) {
    try {
      const parsed = safeParse(rawSchema, JSON.parse(raw));

      if (parsed.success) {
        return { ...parsed.data, date: parsed.data.date ?? "" };
      }
    } catch {
      // Plain text that happens to start with a brace.
    }
  }

  return { plain: raw, html: "", date: "" };
}

const linkedinEmail: PushCollector = {
  type: "linkedin-email",
  read(body) {
    const { messages } = parseInput(bodySchema, body);

    // The plain body says which jobs there are, with their title, company
    // and location: read as text, the HTML one mixes those up. The HTML one
    // adds workplace and salary.
    return messages.flatMap((message) =>
      readMail({
        plain: compactLinks(tidyLines(message.plain ?? "")),
        html: message.html === undefined ? "" : compactLinks(htmlToText(message.html)),
        date: message.date ?? "",
      }),
    );
  },
  reread(raw, externalId) {
    return readMail(storedMail(raw)).find((posting) => posting.externalId === externalId);
  },
};

export { JOB_LINK, linkedinEmail, readMail };
