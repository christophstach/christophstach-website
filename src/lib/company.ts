// How the desk names a company's facts and finds the company of a posting.
import { COMPANY_FIELD_LABELS, COMPANY_FUNDING_LABELS } from "../data/companies";
import type { Company } from "../data/companies";
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

/** The companies by their matching key, to find a posting's company by its name. */
function companiesByKey<Described extends Pick<Company, "name">>(
  companies: readonly Described[],
): ReadonlyMap<string, Described> {
  return new Map(companies.map((company) => [companyKey(company.name), company]));
}

export { companiesByKey, companyFacts, countryName };
