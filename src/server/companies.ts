import "server-only";
import { COMPANY_FIELDS, COMPANY_FUNDINGS } from "../data/companies";
import type { Company, CompanyRecord } from "../data/companies";
import { and, asc, eq, ne } from "drizzle-orm";
import { HttpError } from "./http";
import { companies } from "../../server/db/schema";
import { companyKey } from "../lib/posting";
import { useDb } from "./db";

// The companies postings come from, each described once. A posting finds its
// company by name (companyKey), so the key is unique.

type CompanyRow = typeof companies.$inferSelect;

function toCompany(row: CompanyRow): CompanyRecord {
  return {
    id: row.id,
    name: row.name,
    field: COMPANY_FIELDS.find((field) => field === row.field) ?? "",
    headquarters: row.headquarters,
    funding: COMPANY_FUNDINGS.find((funding) => funding === row.funding) ?? "",
    website: row.website,
    note: row.note,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function notFound(id: string) {
  return new HttpError(404, `No company "${id}".`);
}

/** All companies, by name. */
async function listCompanies(): Promise<CompanyRecord[]> {
  const rows = await useDb().select().from(companies).orderBy(asc(companies.name));

  return rows.map(toCompany);
}

async function findCompany(id: string): Promise<CompanyRecord | undefined> {
  const [row] = await useDb().select().from(companies).where(eq(companies.id, id));

  return row === undefined ? undefined : toCompany(row);
}

async function requireCompany(id: string): Promise<CompanyRecord> {
  const company = await findCompany(id);

  if (company === undefined) {
    throw notFound(id);
  }

  return company;
}

/** The id of the company with this matching key; undefined if none, or only `except` has it. */
async function companyWithKey(key: string, except = ""): Promise<string | undefined> {
  const [row] = await useDb()
    .select({ id: companies.id })
    .from(companies)
    .where(and(eq(companies.key, key), ne(companies.id, except)));

  return row?.id;
}

function columns(company: Company) {
  return { ...company, key: companyKey(company.name), updatedAt: new Date() };
}

/** Stores a new company; 409 if the id is taken or another one has the same name. */
async function createCompany(company: Company) {
  const twin = await companyWithKey(companyKey(company.name));

  if (twin !== undefined) {
    throw new HttpError(409, `"${company.name}" is described already, as "${twin}".`);
  }

  const written = await useDb()
    .insert(companies)
    .values(columns(company))
    .onConflictDoNothing()
    .returning({ id: companies.id });

  if (written.length === 0) {
    throw new HttpError(409, `Company "${company.id}" exists.`);
  }
}

/** Changes a company (404 if missing); 409 if its new name is another company's. */
async function saveCompany(company: Company) {
  const twin = await companyWithKey(companyKey(company.name), company.id);

  if (twin !== undefined) {
    throw new HttpError(409, `"${company.name}" is described already, as "${twin}".`);
  }

  const written = await useDb()
    .update(companies)
    .set(columns(company))
    .where(eq(companies.id, company.id))
    .returning({ id: companies.id });

  if (written.length === 0) {
    throw notFound(company.id);
  }
}

async function deleteCompany(id: string) {
  const deleted = await useDb()
    .delete(companies)
    .where(eq(companies.id, id))
    .returning({ id: companies.id });

  if (deleted.length === 0) {
    throw notFound(id);
  }
}

export { createCompany, deleteCompany, findCompany, listCompanies, requireCompany, saveCompany };
