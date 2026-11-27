import "server-only";
import { Clock, Effect, Schema } from "effect";
import { COMPANY_FIELDS, COMPANY_FUNDINGS } from "../data/companies";
import type { Company } from "../data/companies";
import { slugify } from "../lib/cover-letter";
import { companyKey } from "../lib/posting";
import { requireUserEffect } from "./auth";
import {
  createCompanyEffect,
  deleteCompanyEffect,
  listCompaniesEffect,
  requireCompanyEffect,
  saveCompanyEffect,
} from "./companies";
import { checkCompaniesEffect } from "./company-check";
import { runServerEffect } from "./effect";
import {
  decodeBodyEffect,
  emptyOrMatchingSchema,
  requireSlugEffect,
  textSchema,
  trimmedSchema,
} from "./input";

// The desk's company writes and the lookup. Each checks the session first and
// parses its input.

const NOT_COMPANY = "Not a company.";

const CompanyNameSchema = textSchema("The company needs a name.");

const CompanySchema = Schema.Struct({
  name: CompanyNameSchema,
  field: Schema.Literals(["", ...COMPANY_FIELDS]).annotate({ message: NOT_COMPANY }),
  headquarters: emptyOrMatchingSchema(
    /^[A-Z]{2}$/u,
    "The headquarters is a two-letter country code.",
  ),
  funding: Schema.Literals(["", ...COMPANY_FUNDINGS]).annotate({ message: NOT_COMPANY }),
  website: emptyOrMatchingSchema(
    /^https?:\/\/\S+$/u,
    "The website is an address starting with https://.",
  ),
  note: trimmedSchema(NOT_COMPANY),
}).annotate({ message: NOT_COMPANY });

/** A company id that is free: the slug, or the slug with a number. */
function freeCompanyIdEffect(slug: string) {
  return Effect.gen(function* () {
    const companies = yield* listCompaniesEffect();
    const taken = new Set(companies.map((company) => company.id));

    for (let number = 1; ; number += 1) {
      const id = number === 1 ? slug : `${slug}-${number}`;

      if (!taken.has(id)) {
        return id;
      }
    }
  });
}

/** Starts describing a company, by the name its postings give; answers its id. */
function createDeskCompanyEffect(name: unknown) {
  return Effect.gen(function* () {
    yield* requireUserEffect();

    const parsed = yield* decodeBodyEffect(CompanyNameSchema, name);
    const id = yield* freeCompanyIdEffect(slugify(parsed) || "company");

    yield* createCompanyEffect({
      id,
      name: parsed,
      field: "",
      headquarters: "",
      funding: "",
      website: "",
      note: "",
    });

    const now = yield* Clock.currentTimeMillis;

    yield* checkCompaniesEffect({
      deadline: now + 20_000,
      keys: new Set([companyKey(parsed)]),
    });

    return id;
  });
}

/** Starts describing a company, by the name its postings give; answers its id. */
function createDeskCompany(name: unknown): Promise<string> {
  return runServerEffect(createDeskCompanyEffect(name));
}

function saveDeskCompanyEffect(id: string, company: unknown) {
  return Effect.gen(function* () {
    yield* requireUserEffect();
    yield* requireSlugEffect(id);

    const parsed: Omit<Company, "id"> = yield* decodeBodyEffect(CompanySchema, company);

    yield* saveCompanyEffect({ id, ...parsed });
  });
}

function saveDeskCompany(id: string, company: unknown): Promise<void> {
  return runServerEffect(saveDeskCompanyEffect(id, company));
}

function deleteDeskCompanyEffect(id: string) {
  return Effect.gen(function* () {
    yield* requireUserEffect();
    yield* deleteCompanyEffect(id);
  });
}

function deleteDeskCompany(id: string): Promise<void> {
  return runServerEffect(deleteDeskCompanyEffect(id));
}

/** Asks the free sources about the company again, even if they were asked lately. */
function recheckDeskCompanyEffect(id: string) {
  return Effect.gen(function* () {
    yield* requireUserEffect();

    const company = yield* requireCompanyEffect(id);
    const now = yield* Clock.currentTimeMillis;

    yield* checkCompaniesEffect({
      deadline: now + 20_000,
      keys: new Set([companyKey(company.name)]),
      force: true,
    });
  });
}

/** Asks the free sources about the company again, even if they were asked lately. */
function recheckDeskCompany(id: string): Promise<void> {
  return runServerEffect(recheckDeskCompanyEffect(id));
}

export {
  CompanySchema,
  createDeskCompany,
  createDeskCompanyEffect,
  deleteDeskCompany,
  deleteDeskCompanyEffect,
  recheckDeskCompany,
  recheckDeskCompanyEffect,
  saveDeskCompany,
  saveDeskCompanyEffect,
};
