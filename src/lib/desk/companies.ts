// The desk's company writes and the lookup, as server functions. Arguments are
// typed for the caller and parsed again on the server.
import type { Company, CompanySuggestion } from "../../data/companies";

/** Starts describing a company by its name; answers its id. */
export async function createDeskCompany(name: string): Promise<string> {
  "use server";

  const desk = await import("../../server/desk-companies");

  return desk.createDeskCompany(name);
}

export async function saveDeskCompany(id: string, company: Omit<Company, "id">): Promise<void> {
  "use server";

  const desk = await import("../../server/desk-companies");

  await desk.saveDeskCompany(id, company);
}

export async function deleteDeskCompany(id: string): Promise<void> {
  "use server";

  const desk = await import("../../server/desk-companies");

  await desk.deleteDeskCompany(id);
}

/**
 * Suggests the company's field, headquarters and funding from a web search.
 * Not a query: the router refetches queries after every server function, and
 * this one costs a request to Claude.
 */
export async function lookUpDeskCompany(id: string): Promise<CompanySuggestion> {
  "use server";

  const desk = await import("../../server/desk-companies");

  return desk.lookUpDeskCompany(id);
}
