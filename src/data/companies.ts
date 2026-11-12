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

/** A company as the desk lists it. */
interface CompanyRecord extends Company {
  /** ISO timestamp of the last save. */
  updatedAt: string;
}

/** What a lookup suggests for a company; nothing is saved until the desk saves it. */
interface CompanySuggestion {
  field: CompanyField | "";
  headquarters: string;
  funding: CompanyFunding | "";
  website: string;
  /** Two or three sentences on what it does and how it's funded. */
  summary: string;
  /** Pages the suggestion rests on. */
  sources: string[];
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
export type { Company, CompanyField, CompanyFunding, CompanyRecord, CompanySuggestion };
