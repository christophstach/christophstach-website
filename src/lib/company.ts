// How the desk names a company's facts and finds the company of a posting.
import { COMPANY_FIELD_LABELS, COMPANY_FUNDING_LABELS } from "../data/companies";
import type { Company, CompanyField, CompanyFunding, CompanyRecord } from "../data/companies";
import { companyKey } from "./posting";

const countries = new Intl.DisplayNames(["en"], { type: "region" });

/** "US" → "United States"; the code itself if the browser doesn't know it. */
function countryName(code: string): string {
  try {
    return countries.of(code) ?? code;
  } catch {
    return code;
  }
}

/** Country names other than the browser's that the sources use. */
const COUNTRY_ALIASES: Record<string, string> = {
  "united states of america": "US",
  usa: "US",
  "u.s.": "US",
  uk: "GB",
  england: "GB",
  scotland: "GB",
  wales: "GB",
  deutschland: "DE",
};

/** Every two-letter region code, by its English name in lower case. */
let countriesByName: ReadonlyMap<string, string> | undefined;

/** "United States of America" or "Germany" → its ISO code; empty if not a country. */
function countryCode(name: string): string {
  const wanted = name.trim().toLowerCase();

  if (countriesByName === undefined) {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    const names = new Map<string, string>();

    for (const first of letters) {
      for (const second of letters) {
        const code = `${first}${second}`;
        const english = countryName(code);

        if (english !== code) {
          names.set(english.toLowerCase(), code);
        }
      }
    }

    countriesByName = names;
  }

  return COUNTRY_ALIASES[wanted] ?? countriesByName.get(wanted) ?? "";
}

/** "AI · United States · VC-backed": what is known, in that order; empty if nothing. */
function companyFacts(company: Pick<Company, "field" | "headquarters" | "funding">): string {
  return [
    company.field === "" ? "" : COMPANY_FIELD_LABELS[company.field],
    company.headquarters === "" ? "" : countryName(company.headquarters),
    company.funding === "" ? "" : COMPANY_FUNDING_LABELS[company.funding],
  ]
    .filter((part) => part !== "")
    .join(" · ");
}

/** A short label of a company in the postings: "YC W25", "VC", "AI", "US". */
interface CompanyLabel {
  text: string;
  /** Said in full, for the tooltip and screen readers. */
  title: string;
  /** Funding: what the inbox is sorted by first. */
  strong: boolean;
}

const SHORT_FIELDS: Record<CompanyField, string> = {
  ai: "AI",
  devtools: "Dev tools",
  data: "Data",
  security: "Security",
  fintech: "Fintech",
  health: "Health",
  commerce: "Commerce",
  mobility: "Mobility",
  enterprise: "Enterprise",
  consumer: "Consumer",
  agency: "Agency",
  other: "",
};

const SHORT_FUNDINGS: Record<CompanyFunding, string> = {
  vc: "VC",
  public: "Public",
  private: "Private",
  subsidiary: "Group",
};

/** Its labels: YC batch or funding, field, country; what is known, in that order. */
function companyLabels(
  company: Pick<CompanyRecord, "batch" | "field" | "headquarters" | "funding">,
): CompanyLabel[] {
  const labels: CompanyLabel[] = [];

  if (company.batch !== "") {
    labels.push({
      text: `YC ${company.batch}`,
      title: `Y Combinator, batch ${company.batch}`,
      strong: true,
    });
  } else if (company.funding !== "") {
    labels.push({
      text: SHORT_FUNDINGS[company.funding],
      title: COMPANY_FUNDING_LABELS[company.funding],
      strong: company.funding === "vc",
    });
  }

  if (company.field !== "" && SHORT_FIELDS[company.field] !== "") {
    labels.push({
      text: SHORT_FIELDS[company.field],
      title: COMPANY_FIELD_LABELS[company.field],
      strong: false,
    });
  }

  if (company.headquarters !== "") {
    labels.push({
      text: company.headquarters,
      title: `Based in ${countryName(company.headquarters)}`,
      strong: false,
    });
  }

  return labels;
}

/** The companies by their matching key, to find a posting's company by its name. */
function companiesByKey<Described extends Pick<Company, "name">>(
  companies: readonly Described[],
): ReadonlyMap<string, Described> {
  return new Map(companies.map((company) => [companyKey(company.name), company]));
}

/** The funding filter's option for Y Combinator companies. */
const YC_FUNDING_OPTION = { value: "yc", label: "Y Combinator" } as const;

/**
 * A company's values for a funding filter: its funding, and "yc" for a YC
 * company, which is also venture-backed. Unknown ("") without a company.
 */
function fundingValues(
  company: Pick<CompanyRecord, "batch" | "funding"> | undefined,
): readonly string[] {
  if (company === undefined || company.batch === "") {
    return [company?.funding ?? ""];
  }

  return [YC_FUNDING_OPTION.value, company.funding || "vc"];
}

export {
  YC_FUNDING_OPTION,
  companiesByKey,
  companyFacts,
  companyLabels,
  countryCode,
  countryName,
  fundingValues,
};
export type { CompanyLabel };
