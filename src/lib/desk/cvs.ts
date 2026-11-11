// The desk's CV writes, prints and page checks, as server functions.
// Arguments are typed for the caller and parsed again on the server.
import type { CvLayout } from "../../data/cv-print-layout";
import type { Cv } from "../../data/cvs";
import { query } from "@solidjs/router";

/** A CV as the editor saves it. */
type CvInput = Omit<Cv, "id">;

export async function saveDeskCv(
  id: string,
  cv: CvInput,
  options: { create: boolean },
): Promise<void> {
  "use server";

  const desk = await import("../../server/desk-cvs");

  await desk.saveCv(id, cv, options);
}

export async function deleteDeskCv(id: string): Promise<void> {
  "use server";

  const desk = await import("../../server/desk-cvs");

  await desk.deleteCv(id);
}

/** Gives a CV the primary role (the PDF) or the website role (/curriculum). */
export async function markDeskCv(id: string, role: "primary" | "website"): Promise<void> {
  "use server";

  const desk = await import("../../server/desk-cvs");

  await desk.markRole(id, role);
}

/**
 * How full each page of a CV's PDF is; a trial layout is printed and
 * shown, never stored. A plain server function, not a query: it runs Chrome,
 * and queries are refetched after every server function call.
 */
export async function checkCvPages({ id, trial }: { id: string; trial?: CvLayout | undefined }) {
  "use server";

  const { cvLayoutSchema } = await import("../../data/cv-print-layout");
  const { parseInput } = await import("../../server/input");
  const desk = await import("../../server/desk-cvs");

  return desk.checkPages(id, trial === undefined ? undefined : parseInput(cvLayoutSchema, trial));
}

/**
 * A CV's printed content for /desk/cv-print/<id>, with trial steps when
 * given. One object argument, the trial field left out when there is none:
 * server function arguments travel as JSON, which can't carry undefined.
 */
export const getDeskCvPrint = query(async ({ id, trial }: { id: string; trial?: CvLayout }) => {
  "use server";

  const { cvLayoutSchema } = await import("../../data/cv-print-layout");
  const { parseInput } = await import("../../server/input");
  const desk = await import("../../server/desk-cvs");

  return desk.printForDesk(id, trial === undefined ? undefined : parseInput(cvLayoutSchema, trial));
}, "desk-cv-print");

export type { CvInput };
