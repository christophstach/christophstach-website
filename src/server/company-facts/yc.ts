import "server-only";
import { Effect, Option, Schema } from "effect";
import type { CompanyField, CompanyFunding } from "../../data/companies";
import { companyKey } from "../../lib/posting";
import { countryCode } from "../../lib/company";
import { ExternalFetchError, runServerEffect } from "../effect";

// Y Combinator's companies, from the unofficial yc-oss list: static JSON on
// GitHub Pages, rebuilt daily from YC's own directory. Free, no key. A company
// in it raised venture capital: YC itself invests.

const YC_LIST_URL = "https://yc-oss.github.io/api/companies/all.json";
const YC_FETCH_TIMEOUT = "15 seconds" as const;

/** What the desk reads of a company in the list; other fields are ignored. */
const ycCompanySchema = Schema.Struct({
  name: Schema.String,
  former_names: Schema.optional(Schema.Array(Schema.String)),
  website: Schema.optional(Schema.String),
  batch: Schema.optional(Schema.String),
  regions: Schema.optional(Schema.Array(Schema.String)),
  industry: Schema.optional(Schema.String),
  subindustry: Schema.optional(Schema.String),
  tags: Schema.optional(Schema.Array(Schema.String)),
  url: Schema.optional(Schema.String),
  status: Schema.optional(Schema.String),
});

const ycListSchema = Schema.Array(Schema.Unknown);

const decodeYcList = Schema.decodeUnknownEffect(ycListSchema);
const decodeYcCompany = Schema.decodeUnknownOption(ycCompanySchema);

/** The facts a YC company gives. */
interface YcFacts {
  field: CompanyField | "";
  headquarters: string;
  /** Venture-backed, unless it went public or was bought. */
  funding: CompanyFunding;
  website: string;
  /** e.g. "W25". */
  batch: string;
  /** Its page on ycombinator.com. */
  url: string;
}

/** YC's status, as funding; any other (Active, Inactive) means venture-backed. */
const YC_FUNDING: Record<string, CompanyFunding> = { Public: "public", Acquired: "subsidiary" };

const SEASONS: Record<string, string> = { Winter: "W", Spring: "X", Summer: "S", Fall: "F" };

/** "Winter 2025" → "W25"; empty for "Unspecified" and anything else. */
function shortBatch(batch: string): string {
  const match = /^(Winter|Spring|Summer|Fall) \d{2}(\d{2})$/u.exec(batch);

  return match?.[1] === undefined || match[2] === undefined
    ? ""
    : `${SEASONS[match[1]] ?? ""}${match[2]}`;
}

/** Tags that make a company an AI company, whatever its industry. */
const AI_TAGS = new Set([
  "AI",
  "Artificial Intelligence",
  "Generative AI",
  "Machine Learning",
  "Deep Learning",
  "AI Assistant",
  "Conversational AI",
  "AIOps",
  "Reinforcement Learning",
]);

/** YC's industry and subindustry, as the desk's field. */
function ycField(industry: string, subindustry: string, tags: readonly string[]): CompanyField {
  if (tags.some((tag) => AI_TAGS.has(tag))) {
    return "ai";
  }

  const sub = subindustry.split(" -> ")[1] ?? "";

  switch (industry) {
    case "Fintech": {
      return "fintech";
    }
    case "Healthcare": {
      return "health";
    }
    case "Consumer": {
      return sub === "Transportation Services" ? "mobility" : "consumer";
    }
    case "Industrials": {
      return sub === "Automotive" || sub === "Aviation and Space" ? "mobility" : "other";
    }
    case "B2B": {
      if (sub === "Engineering, Product and Design") {
        return "devtools";
      }

      if (sub === "Infrastructure" || sub === "Analytics") {
        return "data";
      }

      if (sub === "Security") {
        return "security";
      }

      if (sub === "Retail") {
        return "commerce";
      }

      if (sub === "Supply Chain and Logistics") {
        return "mobility";
      }

      return "enterprise";
    }
    default: {
      return "other";
    }
  }
}

/** The first region that is a country, as its code: "United States of America" → "US". */
function ycCountry(regions: readonly string[]): string {
  for (const region of regions) {
    const code = countryCode(region);

    if (code !== "") {
      return code;
    }
  }

  return "";
}

/** A full http(s) address; empty for anything else. */
function webAddress(value: string): string {
  try {
    const url = new URL(value.trim());

    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch {
    return "";
  }
}

function fetchYcJsonEffect(): Effect.Effect<unknown, ExternalFetchError> {
  return Effect.gen(function* () {
    const response = yield* Effect.tryPromise({
      try: (signal) =>
        fetch(YC_LIST_URL, {
          headers: { accept: "application/json", "user-agent": "desk-company-facts/1.0" },
          signal,
        }),
      catch: (cause) =>
        new ExternalFetchError({
          message: "The YC list did not answer.",
          url: YC_LIST_URL,
          cause,
        }),
    });

    if (!response.ok) {
      return yield* new ExternalFetchError({
        message: `The YC list answered ${response.status}.`,
        url: YC_LIST_URL,
        upstreamStatus: response.status,
      });
    }

    return yield* Effect.tryPromise({
      try: (): Promise<unknown> => response.json(),
      catch: (cause) =>
        new ExternalFetchError({
          message: "The YC list returned invalid JSON.",
          url: YC_LIST_URL,
          cause,
        }),
    });
  }).pipe(
    Effect.timeout(YC_FETCH_TIMEOUT),
    Effect.catchTag(
      "TimeoutError",
      (cause) =>
        new ExternalFetchError({
          message: "The YC list timed out.",
          url: YC_LIST_URL,
          cause,
        }),
    ),
  );
}

/** The YC list by companyKey, current and former names; companies whose key is taken twice are left out. */
function loadYcListEffect(): Effect.Effect<ReadonlyMap<string, YcFacts>, ExternalFetchError> {
  return Effect.gen(function* () {
    const json = yield* fetchYcJsonEffect();
    const items = yield* decodeYcList(json).pipe(
      Effect.mapError(
        (cause) =>
          new ExternalFetchError({
            message: "The YC list isn't a list.",
            url: YC_LIST_URL,
            cause,
          }),
      ),
    );

    const byKey = new Map<string, YcFacts>();
    const twice = new Set<string>();

    for (const item of items) {
      const company = decodeYcCompany(item);

      if (Option.isNone(company)) {
        continue;
      }

      const data = company.value;
      const { name, former_names: former = [], tags = [] } = data;
      const facts: YcFacts = {
        field: ycField(data.industry ?? "", data.subindustry ?? "", tags),
        headquarters: ycCountry(data.regions ?? []),
        funding: YC_FUNDING[data.status ?? ""] ?? "vc",
        website: webAddress(data.website ?? ""),
        batch: shortBatch(data.batch ?? ""),
        url: webAddress(data.url ?? ""),
      };

      for (const key of new Set([name, ...former].map(companyKey))) {
        if (key === "") {
          continue;
        }

        if (byKey.has(key)) {
          twice.add(key);
        }

        byKey.set(key, facts);
      }
    }

    // Two YC companies with one name: the desk can't tell which is meant.
    for (const key of twice) {
      byKey.delete(key);
    }

    return byKey;
  });
}

/** The YC list by companyKey, current and former names; companies whose key is taken twice are left out. */
async function loadYcList(): Promise<ReadonlyMap<string, YcFacts>> {
  return runServerEffect(loadYcListEffect());
}

export { loadYcList, loadYcListEffect, shortBatch, webAddress };
export type { YcFacts };
