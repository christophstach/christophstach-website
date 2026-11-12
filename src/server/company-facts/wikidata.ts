import "server-only";
import { array, object, record, safeParse, string } from "zod/mini";
import type { CompanyField, CompanyFunding } from "../../data/companies";
import { companyKey } from "../../lib/posting";
import { webAddress } from "./yc";

// Wikidata, the free database behind Wikipedia: it knows larger companies, with
// their country, stock exchange, parent and website. No key. One query searches
// many names at once (its search runs inside the query service), so the desk
// stays well under Wikidata's limits.

const SPARQL_URL = "https://query.wikidata.org/sparql";

/** Names a query searches; the next query takes the rest. */
const NAMES_PER_QUERY = 15;

/** The facts a Wikidata item gives. */
interface WikidataFacts {
  field: CompanyField | "";
  headquarters: string;
  funding: CompanyFunding | "";
  website: string;
  /** The item's page, e.g. https://www.wikidata.org/wiki/Q51844714. */
  url: string;
}

const sparqlAnswer = object({
  results: object({
    bindings: array(record(string(), object({ value: string() }))),
  }),
});

/** Words of Wikidata's industries that mean a field; the first that fits wins. */
const INDUSTRY_FIELDS: readonly [RegExp, CompanyField][] = [
  [/artificial intelligence|machine learning/u, "ai"],
  [/cyber|security/u, "security"],
  [/financ|bank|insurance|payment/u, "fintech"],
  [/health|pharma|medic|biotech/u, "health"],
  [/retail|e-commerce|commerce|fashion|clothing/u, "commerce"],
  [/automotive|transport|mobility|logistic|aviation/u, "mobility"],
  [/consult|staffing|recruit|employment|agency/u, "agency"],
  [/data|cloud|database/u, "data"],
  [/software|information technology|internet/u, "enterprise"],
];

function industryField(industries: string): CompanyField | "" {
  const text = industries.toLowerCase();

  if (text === "") {
    return "";
  }

  return INDUSTRY_FIELDS.find(([pattern]) => pattern.test(text))?.[1] ?? "other";
}

/** A SPARQL string literal. */
function literal(value: string): string {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll(/\s+/gu, " ")}"`;
}

/**
 * Searches each name, keeps the businesses among the first five hits, with
 * their labels and aliases (to check the name) and what they say of themselves.
 */
function factsQuery(names: readonly string[]): string {
  return `SELECT ?name ?item (GROUP_CONCAT(DISTINCT ?alias; separator="|") AS ?names)
  (SAMPLE(?hq) AS ?hqCode) (SAMPLE(?country) AS ?countryCode) (SAMPLE(?exchange) AS ?listed)
  (SAMPLE(?parent) AS ?owner) (SAMPLE(?site) AS ?website)
  (GROUP_CONCAT(DISTINCT ?industryLabel; separator="|") AS ?industries) WHERE {
  VALUES ?name { ${names.map(literal).join(" ")} }
  SERVICE wikibase:mwapi {
    bd:serviceParam wikibase:endpoint "www.wikidata.org"; wikibase:api "EntitySearch";
      mwapi:search ?name; mwapi:language "en"; mwapi:limit "5" .
    ?item wikibase:apiOutputItem mwapi:item .
  }
  FILTER EXISTS { ?item wdt:P31/wdt:P279* wd:Q4830453 }
  { ?item rdfs:label ?alias } UNION { ?item skos:altLabel ?alias }
  FILTER(LANG(?alias) IN ("en", "de"))
  OPTIONAL { ?item wdt:P159/wdt:P17/wdt:P297 ?hq . }
  OPTIONAL { ?item wdt:P17/wdt:P297 ?country . }
  OPTIONAL { ?item wdt:P414 ?exchange . }
  OPTIONAL { ?item wdt:P749 ?parent . }
  OPTIONAL { ?item wdt:P856 ?site . }
  OPTIONAL { ?item wdt:P452 ?industry . ?industry rdfs:label ?industryLabel . FILTER(LANG(?industryLabel) = "en") }
} GROUP BY ?name ?item`;
}

/** One query: the facts of the first business whose label or alias is the name, by key. */
async function queryNames(
  companies: readonly { key: string; name: string }[],
): Promise<Map<string, WikidataFacts>> {
  const url = new URL(SPARQL_URL);

  url.search = new URLSearchParams({
    query: factsQuery(companies.map((company) => company.name)),
    format: "json",
  }).toString();

  const response = await fetch(url, {
    headers: {
      accept: "application/sparql-results+json",
      "user-agent": "desk-company-facts/1.0",
    },
    signal: AbortSignal.timeout(25_000),
  });

  if (!response.ok) {
    throw new Error(`Wikidata answered ${response.status}.`);
  }

  const parsed = safeParse(sparqlAnswer, await response.json());
  const keyOfName = new Map(companies.map((company) => [company.name, company.key]));
  const byKey = new Map<string, WikidataFacts>();

  if (!parsed.success) {
    return byKey;
  }

  for (const row of parsed.data.results.bindings) {
    const key = keyOfName.get(row.name?.value ?? "");
    const id = /Q\d+$/u.exec(row.item?.value ?? "")?.[0];
    // A hit counts only if one of its names is the company's, legal form aside.
    const named = (row.names?.value ?? "").split("|").some((alias) => companyKey(alias) === key);

    if (key === undefined || id === undefined || !named || byKey.has(key)) {
      continue;
    }

    const code = row.hqCode?.value ?? row.countryCode?.value ?? "";

    byKey.set(key, {
      field: industryField(row.industries?.value ?? ""),
      headquarters: /^[A-Z]{2}$/u.test(code) ? code : "",
      funding: row.listed === undefined ? (row.owner === undefined ? "" : "subsidiary") : "public",
      website: webAddress(row.website?.value ?? ""),
      url: `https://www.wikidata.org/wiki/${id}`,
    });
  }

  return byKey;
}

/**
 * The Wikidata facts of the named companies, by key, a query per 15 names
 * until the deadline. A key searched without a match maps to undefined; one
 * not searched (out of time) is missing.
 */
async function wikidataFacts(
  companies: readonly { key: string; name: string }[],
  deadline: number,
): Promise<ReadonlyMap<string, WikidataFacts | undefined>> {
  const byKey = new Map<string, WikidataFacts | undefined>();
  const chunks: { key: string; name: string }[][] = [];

  for (let start = 0; start < companies.length; start += NAMES_PER_QUERY) {
    chunks.push(companies.slice(start, start + NAMES_PER_QUERY));
  }

  // One query after the other: the query service asks for few at a time.
  await chunks.reduce(async (previous, chunk) => {
    await previous;

    if (Date.now() >= deadline) {
      return;
    }

    const found = await queryNames(chunk);

    for (const { key } of chunk) {
      byKey.set(key, found.get(key));
    }
  }, Promise.resolve());

  return byKey;
}

export { wikidataFacts };
export type { WikidataFacts };
