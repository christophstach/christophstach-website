import "server-only";
import { array, exactOptional, looseObject, safeParse, string, union } from "zod/mini";
import type { ZodMiniType, output } from "zod/mini";
import { decodeEntities, htmlToText } from "./text";
import type { FoundPosting } from "./types";
import { HttpError } from "../http";
import { JOB_LINK } from "./linkedin-email";

// A job ad added by its address. Most career pages and job boards describe
// the ad as a schema.org JobPosting in JSON-LD (for Google's job search),
// which this reads. LinkedIn's pages aren't fetched: reading them by script
// breaks LinkedIn's terms; a LinkedIn link keeps only its job id.

const MAX_BYTES = 3_000_000;

const named = union([string(), looseObject({ name: exactOptional(string()) })]);
const listOf = <Item extends ZodMiniType>(item: Item) => union([item, array(item)]);

/** The parts of a schema.org JobPosting the desk keeps; anything else may be there too. */
const jobPostingSchema = looseObject({
  title: exactOptional(string()),
  description: exactOptional(string()),
  datePosted: exactOptional(string()),
  hiringOrganization: exactOptional(named),
  jobLocationType: exactOptional(listOf(string())),
  jobLocation: exactOptional(
    listOf(
      looseObject({
        address: exactOptional(
          union([
            string(),
            looseObject({
              addressLocality: exactOptional(string()),
              addressRegion: exactOptional(string()),
              addressCountry: exactOptional(named),
            }),
          ]),
        ),
      }),
    ),
  ),
});

type JobPostingLd = output<typeof jobPostingSchema>;

function nameOf(value: string | { name?: string } | undefined): string {
  return typeof value === "string" ? value : (value?.name ?? "");
}

function toList<Item>(value: Item | Item[] | undefined): Item[] {
  return value === undefined ? [] : Array.isArray(value) ? value : [value];
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
  const remote = toList(posting.jobLocationType).includes("TELECOMMUTE") ? ["Remote"] : [];

  return [...new Set([...places, ...remote])].filter((place) => place !== "").join(" · ");
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
    raw: "",
  };
}

async function fetchPage(url: URL): Promise<{ html: string; url: URL }> {
  let response: Response;

  try {
    response = await fetch(url, {
      headers: { accept: "text/html", "user-agent": "Mozilla/5.0 (compatible; desk)" },
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new HttpError(502, `${url.host} did not answer.`);
  }

  if (!response.ok) {
    throw new HttpError(502, `${url.host} answered ${response.status}.`);
  }

  const html = await response.text();

  if (html.length > MAX_BYTES) {
    throw new HttpError(502, `The page at ${url.host} is too large to read.`);
  }

  return { html, url: new URL(response.url || url.href) };
}

/** Reads the job ad at an address: from its JSON-LD, or its title if it has none. */
async function readUrl(address: string): Promise<FoundPosting> {
  let url: URL;

  try {
    url = new URL(address.trim());
  } catch {
    throw new HttpError(400, `"${address}" is no address.`);
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new HttpError(400, "Only http and https addresses can be read.");
  }

  const linkedinId = JOB_LINK.exec(url.href)?.[1];

  if (linkedinId !== undefined) {
    return linkedinPosting(linkedinId);
  }

  const page = await fetchPage(url);
  const node = jsonLdBlocks(page.html)
    .map(findJobPosting)
    .find((found) => found !== undefined);
  const parsed = node === undefined ? undefined : safeParse(jobPostingSchema, node);
  const posting = parsed?.success === true ? parsed.data : undefined;
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
    raw: JSON.stringify(node),
  };
}

export { readUrl };
