/** What a company does, roughly; one per company, for filtering the inbox. */
type CompanyField =
  | "ai"
  | "devtools"
  | "data"
  | "security"
  | "fintech"
  | "health"
  | "commerce"
  | "mobility"
  | "enterprise"
  | "consumer"
  | "agency"
  | "other";

/** Who owns and funds it. */
type CompanyFunding = "vc" | "public" | "private" | "subsidiary";

/** A company the postings come from, described once for all its postings. */
interface Company {
  /** URL slug, e.g. /desk/companies/example-labs. */
  id: string;
  /** As the postings name it, e.g. "Example Labs GmbH". */
  name: string;
  field: CompanyField | "";
  /** Where it's headquartered: an ISO 3166 country code, e.g. "US"; empty if unknown. */
  headquarters: string;
  funding: CompanyFunding | "";
  website: string;
  /** Free text: investors, last round, what it builds. */
  note: string;
}

/** Where a company's facts were found. */
type CompanySourceKind = "yc" | "wikidata" | "ad";

/** One place a company's facts come from: its YC page, its Wikidata item, or one of its ads. */
interface CompanySource {
  kind: CompanySourceKind;
  /** The page; for an ad, the posting's desk id. */
  url: string;
  /** What it says, e.g. "YC W25" or a sentence from the ad. */
  text: string;
}

/** A company as the desk lists it, with what the free sources found. */
interface CompanyRecord extends Company {
  /** Its Y Combinator batch, e.g. "W25"; empty if none. */
  batch: string;
  sources: CompanySource[];
  /** ISO timestamp of the last check of the sources; empty if never. */
  checkedAt: string;
  /** ISO timestamp of the last save. */
  updatedAt: string;
}

const COMPANY_FIELDS: readonly CompanyField[] = [
  "ai",
  "devtools",
  "data",
  "security",
  "fintech",
  "health",
  "commerce",
  "mobility",
  "enterprise",
  "consumer",
  "agency",
  "other",
];

const COMPANY_FIELD_LABELS: Record<CompanyField, string> = {
  ai: "AI",
  devtools: "Developer tools",
  data: "Data & infrastructure",
  security: "Security",
  fintech: "Fintech",
  health: "Health",
  commerce: "Commerce",
  mobility: "Mobility",
  enterprise: "Enterprise software",
  consumer: "Consumer",
  agency: "Agency & consulting",
  other: "Other",
};

const COMPANY_FUNDINGS: readonly CompanyFunding[] = ["vc", "public", "private", "subsidiary"];

const COMPANY_FUNDING_LABELS: Record<CompanyFunding, string> = {
  vc: "VC-backed",
  public: "Public",
  private: "Bootstrapped or private",
  subsidiary: "Part of a group",
};

/** The countries the headquarters select offers first; any other code shows too. */
const COMMON_COUNTRIES: readonly string[] = [
  "US",
  "DE",
  "GB",
  "FR",
  "NL",
  "CH",
  "AT",
  "IE",
  "SE",
  "DK",
  "FI",
  "ES",
  "PL",
  "CA",
  "IL",
  "IN",
];

export {
  COMMON_COUNTRIES,
  COMPANY_FIELDS,
  COMPANY_FIELD_LABELS,
  COMPANY_FUNDINGS,
  COMPANY_FUNDING_LABELS,
};
export type {
  Company,
  CompanyField,
  CompanyFunding,
  CompanyRecord,
  CompanySource,
  CompanySourceKind,
};
