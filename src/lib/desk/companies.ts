// The desk's company writes and the lookup, as server functions. Arguments are
// typed for the caller and parsed again on the server.
import type { Company } from "../../data/companies";
import { deskAction } from "./mutation";

/** Starts describing a company by its name; answers its id. */
export const createDeskCompany = deskAction(async (name: string): Promise<string> => {
  "use server";

  const desk = await import("../../server/desk-companies");

  return desk.createDeskCompany(name);
});

export const saveDeskCompany = deskAction(
  async (id: string, company: Omit<Company, "id">): Promise<void> => {
    "use server";

    const desk = await import("../../server/desk-companies");

    await desk.saveDeskCompany(id, company);
  },
);

export const deleteDeskCompany = deskAction(async (id: string): Promise<void> => {
  "use server";

  const desk = await import("../../server/desk-companies");

  await desk.deleteDeskCompany(id);
});

/** Asks the free sources (YC, Wikidata, the ads) about the company again. */
export const recheckDeskCompany = deskAction(async (id: string): Promise<void> => {
  "use server";

  const desk = await import("../../server/desk-companies");

  await desk.recheckDeskCompany(id);
});
