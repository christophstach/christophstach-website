import "server-only";
import { Effect } from "effect";
import { and, asc, eq, ne } from "drizzle-orm";
import { companies } from "../../server/db/schema";
import { COMPANY_FIELDS, COMPANY_FUNDINGS } from "../data/companies";
import type { Company, CompanyRecord, CompanySource } from "../data/companies";
import { companyKey } from "../lib/posting";
import type { DatabaseTransaction } from "./db";
import { type Database, dbQuery, dbTransaction, isPgErrorCode } from "./effect/db";
import {
  type ConfigError,
  ConflictError,
  type DatabaseError,
  NotFoundError,
} from "./effect/errors";
import { runServerEffect } from "./effect/runtime";

// The companies postings come from, each described once. A posting finds its
// company by name (companyKey), so the key is unique.

type CompanyRow = typeof companies.$inferSelect;

type CreateCompanyOutcome =
  | { readonly _tag: "created" }
  | { readonly _tag: "duplicateName"; readonly twinId: string }
  | { readonly _tag: "duplicateId" };

type SaveCompanyOutcome =
  | { readonly _tag: "saved" }
  | { readonly _tag: "duplicateName"; readonly twinId: string }
  | { readonly _tag: "notFound" };

function toCompany(row: CompanyRow): CompanyRecord {
  return {
    id: row.id,
    name: row.name,
    field: COMPANY_FIELDS.find((field) => field === row.field) ?? "",
    headquarters: row.headquarters,
    funding: COMPANY_FUNDINGS.find((funding) => funding === row.funding) ?? "",
    website: row.website,
    note: row.note,
    batch: row.batch,
    sources: row.sources,
    checkedAt: row.checkedAt?.toISOString() ?? "",
    updatedAt: row.updatedAt.toISOString(),
  };
}

function notFound(id: string): NotFoundError {
  return new NotFoundError({ message: `No company "${id}".` });
}

/** The id of the company with this matching key; undefined if none, or only `except` has it. */
async function findCompanyWithKey(
  tx: DatabaseTransaction,
  key: string,
  except = "",
): Promise<string | undefined> {
  const [row] = await tx
    .select({ id: companies.id })
    .from(companies)
    .where(and(eq(companies.key, key), ne(companies.id, except)));

  return row?.id;
}

function columns(company: Company) {
  return { ...company, key: companyKey(company.name), updatedAt: new Date() };
}

/** All companies, by name. */
function listCompaniesEffect(): Effect.Effect<
  CompanyRecord[],
  DatabaseError | ConfigError,
  Database
> {
  return Effect.gen(function* () {
    const rows = yield* dbQuery(
      (db) => db.select().from(companies).orderBy(asc(companies.name)),
      "Could not list companies.",
    );

    return rows.map(toCompany);
  });
}

function findCompanyEffect(
  id: string,
): Effect.Effect<CompanyRecord | undefined, DatabaseError | ConfigError, Database> {
  return Effect.gen(function* () {
    const [row] = yield* dbQuery(
      (db) => db.select().from(companies).where(eq(companies.id, id)),
      "Could not load company.",
    );

    return row === undefined ? undefined : toCompany(row);
  });
}

function requireCompanyEffect(
  id: string,
): Effect.Effect<CompanyRecord, NotFoundError | DatabaseError | ConfigError, Database> {
  return Effect.gen(function* () {
    const company = yield* findCompanyEffect(id);

    if (company === undefined) {
      return yield* notFound(id);
    }

    return company;
  });
}

function conflictOnDuplicateKey(
  companyName: string,
): (error: DatabaseError) => Effect.Effect<never, ConflictError | DatabaseError> {
  return (error) =>
    isPgErrorCode(error, "23505")
      ? new ConflictError({
          message: `"${companyName}" is described already.`,
          cause: error,
        })
      : error;
}

/** Stores a new company; 409 if the id is taken or another one has the same name. */
function createCompanyEffect(
  company: Company,
): Effect.Effect<void, ConflictError | DatabaseError | ConfigError, Database> {
  return Effect.gen(function* () {
    const outcome = yield* dbTransaction<CreateCompanyOutcome>(async (tx) => {
      const twin = await findCompanyWithKey(tx, companyKey(company.name));

      if (twin !== undefined) {
        return { _tag: "duplicateName", twinId: twin };
      }

      const written = await tx
        .insert(companies)
        .values(columns(company))
        .onConflictDoNothing({ target: companies.id })
        .returning({ id: companies.id });

      if (written.length === 0) {
        return { _tag: "duplicateId" };
      }

      return { _tag: "created" };
    }, "Could not create company.").pipe(
      Effect.catchTag("DatabaseError", conflictOnDuplicateKey(company.name)),
    );

    if (outcome._tag === "duplicateName") {
      return yield* new ConflictError({
        message: `"${company.name}" is described already, as "${outcome.twinId}".`,
      });
    }

    if (outcome._tag === "duplicateId") {
      return yield* new ConflictError({ message: `Company "${company.id}" exists.` });
    }

    return undefined;
  });
}

/** Changes a company (404 if missing); 409 if its new name is another company's. */
function saveCompanyEffect(
  company: Company,
): Effect.Effect<void, NotFoundError | ConflictError | DatabaseError | ConfigError, Database> {
  return Effect.gen(function* () {
    const outcome = yield* dbTransaction<SaveCompanyOutcome>(async (tx) => {
      const twin = await findCompanyWithKey(tx, companyKey(company.name), company.id);

      if (twin !== undefined) {
        return { _tag: "duplicateName", twinId: twin };
      }

      const written = await tx
        .update(companies)
        .set(columns(company))
        .where(eq(companies.id, company.id))
        .returning({ id: companies.id });

      if (written.length === 0) {
        return { _tag: "notFound" };
      }

      return { _tag: "saved" };
    }, "Could not save company.").pipe(
      Effect.catchTag("DatabaseError", conflictOnDuplicateKey(company.name)),
    );

    if (outcome._tag === "duplicateName") {
      return yield* new ConflictError({
        message: `"${company.name}" is described already, as "${outcome.twinId}".`,
      });
    }

    if (outcome._tag === "notFound") {
      return yield* notFound(company.id);
    }

    return undefined;
  });
}

/** What the free sources found for a company; see company-facts.ts. */
interface FoundFacts {
  field: Company["field"];
  headquarters: string;
  funding: Company["funding"];
  website: string;
  batch: string;
  sources: CompanySource[];
}

/** Stores what the sources found and when; leaves the save time alone. */
function storeFactsEffect(
  id: string,
  facts: FoundFacts,
): Effect.Effect<void, DatabaseError | ConfigError, Database> {
  return dbQuery(
    (db) =>
      db
        .update(companies)
        .set({ ...facts, checkedAt: new Date() })
        .where(eq(companies.id, id)),
    "Could not save company facts.",
  ).pipe(Effect.asVoid);
}

function deleteCompanyEffect(
  id: string,
): Effect.Effect<void, NotFoundError | DatabaseError | ConfigError, Database> {
  return Effect.gen(function* () {
    const deleted = yield* dbQuery(
      (db) => db.delete(companies).where(eq(companies.id, id)).returning({ id: companies.id }),
      "Could not delete company.",
    );

    if (deleted.length === 0) {
      return yield* notFound(id);
    }

    return undefined;
  });
}

/** All companies, by name. */
async function listCompanies(): Promise<CompanyRecord[]> {
  return runServerEffect(listCompaniesEffect());
}

async function findCompany(id: string): Promise<CompanyRecord | undefined> {
  return runServerEffect(findCompanyEffect(id));
}

async function requireCompany(id: string): Promise<CompanyRecord> {
  return runServerEffect(requireCompanyEffect(id));
}

/** Stores a new company; 409 if the id is taken or another one has the same name. */
async function createCompany(company: Company): Promise<void> {
  return runServerEffect(createCompanyEffect(company));
}

/** Changes a company (404 if missing); 409 if its new name is another company's. */
async function saveCompany(company: Company): Promise<void> {
  return runServerEffect(saveCompanyEffect(company));
}

/** Stores what the sources found and when; leaves the save time alone. */
async function storeFacts(id: string, facts: FoundFacts): Promise<void> {
  return runServerEffect(storeFactsEffect(id, facts));
}

async function deleteCompany(id: string): Promise<void> {
  return runServerEffect(deleteCompanyEffect(id));
}

export {
  createCompany,
  createCompanyEffect,
  deleteCompany,
  deleteCompanyEffect,
  findCompany,
  findCompanyEffect,
  listCompanies,
  listCompaniesEffect,
  requireCompany,
  requireCompanyEffect,
  saveCompany,
  saveCompanyEffect,
  storeFacts,
  storeFactsEffect,
};
export type { FoundFacts };
