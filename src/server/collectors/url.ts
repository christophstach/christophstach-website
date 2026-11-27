import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
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
const MAX_REDIRECTS = 5;
const PAGE_FETCH_TIMEOUT = "10 seconds" as const;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

class PageTooLargeError extends Error {
  constructor() {
    super("Page exceeded maximum byte limit.");
  }
}

function stripIpv6Brackets(hostname: string): string {
  return hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname;
}

function parseIpv4(host: string): readonly [number, number, number, number] | undefined {
  const parts = host.split(".");

  if (parts.length !== 4) {
    return undefined;
  }

  const octets: number[] = [];

  for (const part of parts) {
    if (!/^\d{1,3}$/u.test(part)) {
      return undefined;
    }

    const value = Number(part);

    if (value < 0 || value > 255) {
      return undefined;
    }

    octets.push(value);
  }

  const [a, b, c, d] = octets;

  if (a === undefined || b === undefined || c === undefined || d === undefined) {
    return undefined;
  }

  return [a, b, c, d];
}

function isDisallowedIpv4([a, b, c]: readonly [number, number, number, number]): boolean {
  // 0.0.0.0/8 (this network / 0.0.0.0)
  if (a === 0) {
    return true;
  }

  // 10.0.0.0/8 (RFC1918 private)
  if (a === 10) {
    return true;
  }

  // 100.64.0.0/10 (CGNAT, RFC 6598)
  if (a === 100 && b >= 64 && b <= 127) {
    return true;
  }

  // 127.0.0.0/8 (loopback)
  if (a === 127) {
    return true;
  }

  // 169.254.0.0/16 (link-local & cloud metadata 169.254.169.254)
  if (a === 169 && b === 254) {
    return true;
  }

  // 172.16.0.0/12 (RFC1918 private)
  if (a === 172 && b >= 16 && b <= 31) {
    return true;
  }

  // 192.0.0.0/24 (IETF) & 192.0.2.0/24 (TEST-NET-1)
  if (a === 192 && b === 0 && (c === 0 || c === 2)) {
    return true;
  }

  // 192.168.0.0/16 (RFC1918 private)
  if (a === 192 && b === 168) {
    return true;
  }

  // 198.18.0.0/15 (benchmarking), 198.51.100.0/24 (TEST-NET-2), 203.0.113.0/24 (TEST-NET-3)
  if (
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113)
  ) {
    return true;
  }

  // 224.0.0.0/4 (multicast) and 240.0.0.0/4 (reserved / broadcast)
  return a >= 224;
}

function parseIpv6Groups(part: string): number[] | undefined {
  if (part === "") {
    return [];
  }

  const groups: number[] = [];

  for (const piece of part.split(":")) {
    if (!/^[0-9a-f]{1,4}$/u.test(piece)) {
      return undefined;
    }

    groups.push(Number.parseInt(piece, 16));
  }

  return groups;
}

function parseIpv6(host: string): readonly number[] | undefined {
  // Strip optional zone ID (e.g. fe80::1%eth0 or fe80::1%25eth0).
  const withoutZone = host.split("%")[0] ?? "";

  if (!withoutZone.includes(":")) {
    return undefined;
  }

  let normalized = withoutZone;
  const lastColon = normalized.lastIndexOf(":");
  const tail = normalized.slice(lastColon + 1);

  // Convert embedded IPv4 suffix (e.g. ::ffff:127.0.0.1) to two 16-bit hex groups.
  if (tail.includes(".")) {
    const ipv4 = parseIpv4(tail);

    if (ipv4 === undefined) {
      return undefined;
    }

    const hi = ((ipv4[0] << 8) | ipv4[1]).toString(16);
    const lo = ((ipv4[2] << 8) | ipv4[3]).toString(16);

    normalized = `${normalized.slice(0, lastColon)}:${hi}:${lo}`;
  }

  const halves = normalized.split("::");

  if (halves.length > 2) {
    return undefined;
  }

  const left = parseIpv6Groups(halves[0] ?? "");

  if (left === undefined) {
    return undefined;
  }

  if (halves.length === 1) {
    return left.length === 8 ? left : undefined;
  }

  const right = parseIpv6Groups(halves[1] ?? "");

  if (right === undefined || left.length + right.length >= 8) {
    return undefined;
  }

  const zeros = Array.from({ length: 8 - left.length - right.length }, () => 0);

  return [...left, ...zeros, ...right];
}

function isDisallowedIpv6(groups: readonly number[]): boolean {
  const [g0, g1, g2, g3, g4, g5, g6, g7] = groups;

  if (
    g0 === undefined ||
    g1 === undefined ||
    g2 === undefined ||
    g3 === undefined ||
    g4 === undefined ||
    g5 === undefined ||
    g6 === undefined ||
    g7 === undefined
  ) {
    return true;
  }

  // :: (unspecified) and ::1 (loopback)
  if (g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0 && g6 === 0 && g7 <= 1) {
    return true;
  }

  // ::ffff:0:0/96 (IPv4-mapped) — evaluate the mapped IPv4 address.
  if (g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0xffff) {
    return isDisallowedIpv4([g6 >> 8, g6 & 0xff, g7 >> 8, g7 & 0xff]);
  }

  // ::/96 (deprecated IPv4-compatible)
  if (g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0) {
    return true;
  }

  // 64:ff9b::/96 (NAT64 well-known prefix) — evaluate the embedded IPv4 address.
  if (g0 === 0x0064 && g1 === 0xff9b && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0) {
    return isDisallowedIpv4([g6 >> 8, g6 & 0xff, g7 >> 8, g7 & 0xff]);
  }

  // 100::/64 (discard-only)
  if (g0 === 0x0100 && g1 === 0 && g2 === 0 && g3 === 0) {
    return true;
  }

  // fc00::/7 (unique local / private)
  if ((g0 & 0xfe00) === 0xfc00) {
    return true;
  }

  // fe80::/10 (link-local) and fec0::/10 (deprecated site-local)
  if ((g0 & 0xffc0) === 0xfe80 || (g0 & 0xffc0) === 0xfec0) {
    return true;
  }

  // ff00::/8 (multicast)
  if ((g0 & 0xff00) === 0xff00) {
    return true;
  }

  // 2001:db8::/32 (documentation)
  return g0 === 0x2001 && g1 === 0x0db8;
}

/**
 * Pure SSRF guard: returns true when a hostname or IP address targets
 * loopback, link-local, RFC1918 private, CGNAT, unspecified, multicast,
 * `.local`, `.internal`, or `localhost`.
 */
function isDisallowedHost(hostname: string): boolean {
  const cleaned = stripIpv6Brackets(hostname.trim().toLowerCase()).replace(/\.+$/u, "");

  if (cleaned === "") {
    return true;
  }

  if (
    cleaned === "localhost" ||
    cleaned.endsWith(".localhost") ||
    cleaned === "local" ||
    cleaned.endsWith(".local") ||
    cleaned === "internal" ||
    cleaned.endsWith(".internal") ||
    cleaned === "home.arpa" ||
    cleaned.endsWith(".home.arpa")
  ) {
    return true;
  }

  const ipv4 = parseIpv4(cleaned);

  if (ipv4 !== undefined) {
    return isDisallowedIpv4(ipv4);
  }

  const ipv6 = parseIpv6(cleaned);

  if (ipv6 !== undefined) {
    return isDisallowedIpv6(ipv6);
  }

  // Catch numeric/shorthand IPv4 literals (e.g. 2130706433, 0x7f000001, 127.1)
  // that WHATWG URL normalizes to dotted-quad IPv4.
  try {
    const canonical = stripIpv6Brackets(new URL(`http://${cleaned}/`).hostname);
    const canonicalIpv4 = parseIpv4(canonical);

    if (canonicalIpv4 !== undefined) {
      return isDisallowedIpv4(canonicalIpv4);
    }
  } catch {
    return true;
  }

  return false;
}

/**
 * Validates that a raw URL string is a public http(s) URL whose host is not
 * disallowed (loopback, private, link-local, CGNAT, localhost, `.local`,
 * `.internal`). Throws `BadRequestError` otherwise.
 */
function assertSafePublicUrl(rawUrl: string): URL {
  let url: URL;

  try {
    url = new URL(rawUrl.trim());
  } catch (cause) {
    throw new BadRequestError({ message: `"${rawUrl}" is no address.`, cause });
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new BadRequestError({
      message: "Only http and https addresses can be read.",
    });
  }

  if (url.username !== "" || url.password !== "") {
    throw new BadRequestError({
      message: "Addresses with embedded credentials cannot be read.",
    });
  }

  if (isDisallowedHost(url.hostname)) {
    throw new BadRequestError({
      message: `Addresses pointing to "${url.hostname}" cannot be read.`,
    });
  }

  return url;
}

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

function cancelBodyQuietlyEffect(response: Response): Effect.Effect<void> {
  return Effect.tryPromise({
    try: () => response.body?.cancel() ?? Promise.resolve(),
    catch: () => undefined,
  }).pipe(Effect.ignore);
}

/** Resolves a domain name and verifies none of its DNS records point at a disallowed IP. */
function verifyPublicDnsEffect(
  url: URL,
): Effect.Effect<void, BadRequestError | ExternalFetchError> {
  return Effect.gen(function* () {
    const host = stripIpv6Brackets(url.hostname);

    if (isIP(host) !== 0) {
      return undefined;
    }

    const records = yield* Effect.tryPromise({
      try: () => lookup(host, { all: true, verbatim: true }),
      catch: (cause) =>
        new ExternalFetchError({
          message: `${url.host} did not answer.`,
          url: url.href,
          cause,
        }),
    });

    if (records.length === 0) {
      return yield* new ExternalFetchError({
        message: `${url.host} did not answer.`,
        url: url.href,
      });
    }

    for (const record of records) {
      if (isDisallowedHost(record.address)) {
        return yield* new BadRequestError({
          message: `Addresses pointing to "${url.hostname}" cannot be read.`,
        });
      }
    }

    return undefined;
  });
}

/** Reads an HTTP response body as UTF-8 while enforcing MAX_BYTES before decoding. */
function readBodyCappedEffect(
  response: Response,
  url: URL,
): Effect.Effect<string, ExternalFetchError> {
  return Effect.gen(function* () {
    const contentLengthHeader = response.headers.get("content-length");

    if (contentLengthHeader !== null) {
      const contentLength = Number(contentLengthHeader.trim());

      if (Number.isFinite(contentLength) && contentLength > MAX_BYTES) {
        yield* cancelBodyQuietlyEffect(response);

        return yield* new ExternalFetchError({
          message: `The page at ${url.host} is too large to read.`,
          url: url.href,
        });
      }
    }

    if (response.body === null) {
      return "";
    }

    const body = response.body;

    return yield* Effect.tryPromise({
      try: async (signal) => {
        const reader = body.getReader();
        const chunks: Uint8Array[] = [];
        let totalBytes = 0;

        const onAbort = () => {
          reader.cancel().catch(() => undefined);
        };

        const readNext = async (): Promise<void> => {
          const next = await reader.read();

          if (next.done) {
            return;
          }

          totalBytes += next.value.byteLength;

          if (totalBytes > MAX_BYTES) {
            await reader.cancel();
            throw new PageTooLargeError();
          }

          chunks.push(next.value);
          await readNext();
        };

        signal.addEventListener("abort", onAbort, { once: true });

        try {
          await readNext();
        } finally {
          signal.removeEventListener("abort", onAbort);
          reader.releaseLock();
        }

        const combined = new Uint8Array(totalBytes);
        let offset = 0;

        for (const chunk of chunks) {
          combined.set(chunk, offset);
          offset += chunk.byteLength;
        }

        return new TextDecoder("utf-8").decode(combined);
      },
      catch: (cause) =>
        cause instanceof PageTooLargeError
          ? new ExternalFetchError({
              message: `The page at ${url.host} is too large to read.`,
              url: url.href,
            })
          : new ExternalFetchError({
              message: `${url.host} did not answer.`,
              url: url.href,
              cause,
            }),
    });
  });
}

function fetchPageEffect(
  initialUrl: URL,
): Effect.Effect<{ html: string; url: URL }, BadRequestError | ExternalFetchError> {
  return Effect.gen(function* () {
    let currentUrl = initialUrl;

    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      yield* verifyPublicDnsEffect(currentUrl);

      const response = yield* Effect.tryPromise({
        try: (signal) =>
          fetch(currentUrl, {
            headers: { accept: "text/html", "user-agent": "Mozilla/5.0 (compatible; desk)" },
            redirect: "manual",
            signal,
          }),
        catch: (cause) =>
          new ExternalFetchError({
            message: `${currentUrl.host} did not answer.`,
            url: currentUrl.href,
            cause,
          }),
      });

      if (REDIRECT_STATUSES.has(response.status)) {
        yield* cancelBodyQuietlyEffect(response);

        const location = response.headers.get("location");

        if (location === null || location.trim() === "") {
          return yield* new ExternalFetchError({
            message: `${currentUrl.host} returned a redirect without a target.`,
            url: currentUrl.href,
            upstreamStatus: response.status,
          });
        }

        if (hop === MAX_REDIRECTS) {
          return yield* new ExternalFetchError({
            message: `${currentUrl.host} redirected too many times.`,
            url: currentUrl.href,
            upstreamStatus: response.status,
          });
        }

        currentUrl = yield* Effect.try({
          try: () => assertSafePublicUrl(new URL(location, currentUrl).href),
          catch: (cause) =>
            cause instanceof BadRequestError
              ? cause
              : new BadRequestError({
                  message: `${currentUrl.host} redirected to an invalid address.`,
                  cause,
                }),
        });

        continue;
      }

      if (!response.ok) {
        yield* cancelBodyQuietlyEffect(response);

        return yield* new ExternalFetchError({
          message: `${currentUrl.host} answered ${response.status}.`,
          url: currentUrl.href,
          upstreamStatus: response.status,
        });
      }

      const html = yield* readBodyCappedEffect(response, currentUrl);

      return { html, url: currentUrl };
    }

    return yield* new ExternalFetchError({
      message: `${initialUrl.host} redirected too many times.`,
      url: initialUrl.href,
    });
  }).pipe(
    Effect.timeout(PAGE_FETCH_TIMEOUT),
    Effect.catchTag(
      "TimeoutError",
      (cause) =>
        new ExternalFetchError({
          message: `${initialUrl.host} did not answer.`,
          url: initialUrl.href,
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
      try: () => assertSafePublicUrl(address),
      catch: (cause) =>
        cause instanceof BadRequestError
          ? cause
          : new BadRequestError({ message: `"${address}" is no address.`, cause }),
    });

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

export { assertSafePublicUrl, isDisallowedHost, readUrl, readUrlEffect };
