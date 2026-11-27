import "server-only";
import { Effect, Option, Schema } from "effect";
import { NO_SALARY } from "./salary";
import type { Salary } from "./salary";
import { SALARY_CURRENCIES } from "../../data/postings";
import { BadRequestError, ExternalFetchError, runServerEffect } from "../effect";
import { decodeEntities, htmlToText } from "./text";
import type { FoundPosting } from "./types";
import { JOB_LINK } from "./linkedin-email";

// A job ad added by its address. Most career pages and job boards describe
// the ad as a schema.org JobPosting in JSON-LD (for Google's job search),
// which this reads. LinkedIn's pages aren't fetched: reading them by script
// breaks LinkedIn's terms; a LinkedIn link keeps only its job id.

const MAX_BYTES = 3_000_000;
const PAGE_FETCH_TIMEOUT = "10 seconds" as const;

const named = Schema.Union([
  Schema.String,
  Schema.Struct({ name: Schema.optionalKey(Schema.String) }),
]);
const amount = Schema.Union([Schema.Finite, Schema.String]);
const listOf = <Item extends Schema.Constraint>(item: Item) =>
  Schema.Union([item, Schema.Array(item)]);

/** The parts of a schema.org JobPosting the desk keeps; anything else may be there too. */
const jobPostingSchema = Schema.Struct({
  title: Schema.optionalKey(Schema.String),
  description: Schema.optionalKey(Schema.String),
  datePosted: Schema.optionalKey(Schema.String),
  hiringOrganization: Schema.optionalKey(named),
  jobLocationType: Schema.optionalKey(listOf(Schema.String)),
  baseSalary: Schema.optionalKey(
    listOf(
      Schema.Struct({
        currency: Schema.optionalKey(Schema.String),
        value: Schema.optionalKey(
          Schema.Union([
            amount,
            Schema.Struct({
              value: Schema.optionalKey(amount),
              minValue: Schema.optionalKey(amount),
              maxValue: Schema.optionalKey(amount),
              unitText: Schema.optionalKey(Schema.String),
            }),
          ]),
        ),
      }),
    ),
  ),
  jobLocation: Schema.optionalKey(
    listOf(
      Schema.Struct({
        address: Schema.optionalKey(
          Schema.Union([
            Schema.String,
            Schema.Struct({
              addressLocality: Schema.optionalKey(Schema.String),
              addressRegion: Schema.optionalKey(Schema.String),
              addressCountry: Schema.optionalKey(named),
            }),
          ]),
        ),
      }),
    ),
  ),
});

type JobPostingLd = typeof jobPostingSchema.Type;

const decodeJobPosting = Schema.decodeUnknownOption(jobPostingSchema);

function nameOf(value: string | { readonly name?: string } | undefined): string {
  return typeof value === "string" ? value : (value?.name ?? "");
}

function isReadonlyArray<Item>(value: Item | readonly Item[]): value is readonly Item[] {
  return Array.isArray(value);
}

function toList<Item>(value: Item | readonly Item[] | undefined): readonly Item[] {
  if (value === undefined) {
    return [];
  }

  return isReadonlyArray(value) ? value : [value];
}

/** Whether a JSON-LD node says it is a JobPosting. */
function isJobPosting(node: object): boolean {
  if (!("@type" in node)) {
    return false;
  }

  const type = node["@type"];

  return type === "JobPosting" || (Array.isArray(type) && type.includes("JobPosting"));
}

/** The first JobPosting in a JSON-LD document: itself, in a list, or in an @graph. */
function findJobPosting(node: unknown): unknown {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findJobPosting(item);

      if (found !== undefined) {
        return found;
      }
    }

    return undefined;
  }

  if (typeof node !== "object" || node === null) {
    return undefined;
  }

  if (isJobPosting(node)) {
    return node;
  }

  return "@graph" in node ? findJobPosting(node["@graph"]) : undefined;
}

/** Every JSON-LD block of a page that parses. */
function jsonLdBlocks(html: string): unknown[] {
  const blocks: unknown[] = [];

  for (const match of html.matchAll(
    /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/giu,
  )) {
    try {
      const parsed: unknown = JSON.parse(match[1] ?? "");

      blocks.push(parsed);
    } catch {
      // A broken block among good ones: skip it.
    }
  }

  return blocks;
}

function metaContent(html: string, property: string): string {
  const tag = new RegExp(
    `<meta\\b[^>]*(?:property|name)\\s*=\\s*["']${property}["'][^>]*>`,
    "iu",
  ).exec(html)?.[0];
  const content = tag === undefined ? undefined : /content\s*=\s*["']([^"']*)["']/iu.exec(tag)?.[1];

  return content === undefined ? "" : decodeEntities(content).trim();
}

function pageTitle(html: string): string {
  return decodeEntities(/<title\b[^>]*>([\s\S]*?)<\/title>/iu.exec(html)?.[1] ?? "").trim();
}

function locationOf(posting: JobPostingLd): string {
  const places = toList(posting.jobLocation).map(({ address }) =>
    typeof address === "string"
      ? address
      : [address?.addressLocality, address?.addressRegion, nameOf(address?.addressCountry)]
          .filter((part) => part !== undefined && part !== "")
          .join(", "),
  );
  return [...new Set(places)].filter((place) => place !== "").join(" · ");
}

/** Whether the ad says the job is done remotely; schema.org has no word for hybrid. */
function isRemote(posting: JobPostingLd): boolean {
  return toList(posting.jobLocationType).includes("TELECOMMUTE");
}

/** What a year has of each unit a schema.org salary is given per. */
const PER_YEAR: Record<string, number> = { YEAR: 1, MONTH: 12 };

function numberOf(value: number | string | undefined): number | null {
  const parsed = typeof value === "string" ? Number(value.replaceAll(/[\s,]/gu, "")) : value;

  return parsed === undefined || !Number.isFinite(parsed) || parsed <= 0
    ? null
    : Math.round(parsed);
}

/** The ad's baseSalary per year; NO_SALARY if it states none, or per hour or day. */
function salaryOf(posting: JobPostingLd): Salary {
  const [salary] = toList(posting.baseSalary);
  const value = salary?.value;

  if (salary === undefined || value === undefined) {
    return NO_SALARY;
  }

  const amounts =
    typeof value === "object"
      ? {
          min: value.minValue ?? value.value,
          max: value.maxValue ?? value.value,
          unit: value.unitText,
        }
      : { min: value, max: value, unit: undefined };
  const factor = PER_YEAR[(amounts.unit ?? "YEAR").toUpperCase()];
  const min = numberOf(amounts.min);
  const max = numberOf(amounts.max);
  const currency = SALARY_CURRENCIES.find((code) => code === salary.currency?.toUpperCase());

  if (factor === undefined || (min === null && max === null)) {
    return NO_SALARY;
  }

  return {
    salaryMin: min === null ? null : min * factor,
    salaryMax: max === null ? null : max * factor,
    salaryCurrency: currency ?? "",
  };
}

/** The address without its fragment and tracking parameters: the ad's id on the web. */
function canonicalUrl(url: URL): string {
  const clean = new URL(url);

  clean.hash = "";

  // A copy of the keys: deleting while iterating the params skips some.
  for (const key of Array.from(clean.searchParams.keys())) {
    if (/^(?:utm_|ref$|refid$|trk|tracking)/iu.test(key)) {
      clean.searchParams.delete(key);
    }
  }

  return clean.href;
}

/** A posting from a LinkedIn job link, without fetching it. */
function linkedinPosting(id: string): FoundPosting {
  return {
    source: "linkedin",
    externalId: id,
    url: `https://www.linkedin.com/jobs/view/${id}/`,
    company: "",
    title: "",
    location: "",
    description: "",
    postedOn: "",
    workplace: "",
    ...NO_SALARY,
    raw: "",
  };
}

function fetchPageEffect(url: URL): Effect.Effect<{ html: string; url: URL }, ExternalFetchError> {
  return Effect.gen(function* () {
    const response = yield* Effect.tryPromise({
      try: (signal) =>
        fetch(url, {
          headers: { accept: "text/html", "user-agent": "Mozilla/5.0 (compatible; desk)" },
          redirect: "follow",
          signal,
        }),
      catch: (cause) =>
        new ExternalFetchError({
          message: `${url.host} did not answer.`,
          url: url.href,
          cause,
        }),
    });

    if (!response.ok) {
      return yield* new ExternalFetchError({
        message: `${url.host} answered ${response.status}.`,
        url: url.href,
        upstreamStatus: response.status,
      });
    }

    const html = yield* Effect.tryPromise({
      try: () => response.text(),
      catch: (cause) =>
        new ExternalFetchError({
          message: `${url.host} did not answer.`,
          url: url.href,
          cause,
        }),
    });

    if (html.length > MAX_BYTES) {
      return yield* new ExternalFetchError({
        message: `The page at ${url.host} is too large to read.`,
        url: url.href,
      });
    }

    return { html, url: new URL(response.url || url.href) };
  }).pipe(
    Effect.timeout(PAGE_FETCH_TIMEOUT),
    Effect.catchTag(
      "TimeoutError",
      (cause) =>
        new ExternalFetchError({
          message: `${url.host} did not answer.`,
          url: url.href,
          cause,
        }),
    ),
  );
}

/** Reads the job ad at an address: from its JSON-LD, or its title if it has none. */
function readUrlEffect(
  address: string,
): Effect.Effect<FoundPosting, BadRequestError | ExternalFetchError> {
  return Effect.gen(function* () {
    const url = yield* Effect.try({
      try: () => new URL(address.trim()),
      catch: (cause) => new BadRequestError({ message: `"${address}" is no address.`, cause }),
    });

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return yield* new BadRequestError({
        message: "Only http and https addresses can be read.",
      });
    }

    const linkedinId = JOB_LINK.exec(url.href)?.[1];

    if (linkedinId !== undefined) {
      return linkedinPosting(linkedinId);
    }

    const page = yield* fetchPageEffect(url);
    const node = jsonLdBlocks(page.html)
      .map(findJobPosting)
      .find((found) => found !== undefined);
    const posting = node === undefined ? undefined : Option.getOrUndefined(decodeJobPosting(node));
    const externalId = canonicalUrl(page.url);

    if (posting === undefined) {
      return {
        source: "web",
        externalId,
        url: externalId,
        company: metaContent(page.html, "og:site_name"),
        title: metaContent(page.html, "og:title") || pageTitle(page.html),
        location: "",
        description: htmlToText(metaContent(page.html, "og:description")),
        postedOn: "",
        workplace: "",
        ...NO_SALARY,
        raw: "",
      };
    }

    return {
      source: "web",
      externalId,
      url: externalId,
      company: nameOf(posting.hiringOrganization),
      title: decodeEntities(posting.title ?? "").trim(),
      location: locationOf(posting),
      // The description is HTML, sometimes escaped once more.
      description: htmlToText(decodeEntities(posting.description ?? "")),
      postedOn: /^\d{4}-\d{2}-\d{2}/u.exec(posting.datePosted ?? "")?.[0] ?? "",
      workplace: isRemote(posting) ? "remote" : "",
      ...salaryOf(posting),
      raw: JSON.stringify(node),
    };
  });
}

/** Reads the job ad at an address: from its JSON-LD, or its title if it has none. */
async function readUrl(address: string): Promise<FoundPosting> {
  return runServerEffect(readUrlEffect(address));
}

export { readUrl, readUrlEffect };
