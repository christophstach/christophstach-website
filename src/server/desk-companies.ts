import "server-only";
import { COMPANY_FIELDS, COMPANY_FUNDINGS } from "../data/companies";
import type { Company } from "../data/companies";
import {
  createCompany,
  deleteCompany,
  listCompanies,
  requireCompany,
  saveCompany,
} from "./companies";
import { emptyOrMatching, parseInput, requireSlug, text, trimmed } from "./input";
import { literal, object } from "zod/mini";
import { companyKey } from "../lib/posting";
import { checkCompanies } from "./company-check";
import { requireUser } from "./auth";
import { slugify } from "../lib/cover-letter";

// The desk's company writes and the lookup. Each checks the session first and
// parses its input.

const NOT_COMPANY = "Not a company.";

const companySchema = object(
  {
    name: text("The company needs a name."),
    field: literal(["", ...COMPANY_FIELDS], NOT_COMPANY),
    headquarters: emptyOrMatching(/^[A-Z]{2}$/u, "The headquarters is a two-letter country code."),
    funding: literal(["", ...COMPANY_FUNDINGS], NOT_COMPANY),
    website: emptyOrMatching(
      /^https?:\/\/\S+$/u,
      "The website is an address starting with https://.",
    ),
    note: trimmed(NOT_COMPANY),
  },
  NOT_COMPANY,
);

/** A company id that is free: the slug, or the slug with a number. */
async function freeCompanyId(slug: string): Promise<string> {
  const taken = new Set((await listCompanies()).map((company) => company.id));

  for (let number = 1; ; number += 1) {
    const id = number === 1 ? slug : `${slug}-${number}`;

    if (!taken.has(id)) {
      return id;
    }
  }
}

/** Starts describing a company, by the name its postings give; answers its id. */
async function createDeskCompany(name: unknown): Promise<string> {
  await requireUser();

  const parsed = parseInput(text("The company needs a name."), name);
  const id = await freeCompanyId(slugify(parsed) || "company");

  await createCompany({
    id,
    name: parsed,
    field: "",
    headquarters: "",
    funding: "",
    website: "",
    note: "",
  });
  await checkCompanies({ deadline: Date.now() + 20_000, keys: new Set([companyKey(parsed)]) });

  return id;
}

async function saveDeskCompany(id: string, company: unknown) {
  await requireUser();
  requireSlug(id);

  const parsed: Omit<Company, "id"> = parseInput(companySchema, company);

  await saveCompany({ id, ...parsed });
}

async function deleteDeskCompany(id: string) {
  await requireUser();
  await deleteCompany(id);
}

/** Asks the free sources about the company again, even if they were asked lately. */
async function recheckDeskCompany(id: string) {
  await requireUser();

  const company = await requireCompany(id);

  await checkCompanies({
    deadline: Date.now() + 20_000,
    keys: new Set([companyKey(company.name)]),
    force: true,
  });
}

export { createDeskCompany, deleteDeskCompany, recheckDeskCompany, saveDeskCompany };
