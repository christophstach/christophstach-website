// The desk's CV writes, prints and page checks, as server functions.
// Arguments are typed for the caller and parsed again on the server.
import type { CvLayout } from "../../data/cv-print-layout";
import type { Cv } from "../../data/cvs";
import { query } from "@solidjs/router";
import { deskAction } from "./mutation";

/** A CV as the editor saves it. */
type CvInput = Omit<Cv, "id">;

export const saveDeskCv = deskAction(
  async (id: string, cv: CvInput, options: { create: boolean }): Promise<void> => {
    "use server";

    const desk = await import("../../server/desk-cvs");

    await desk.saveCv(id, cv, options);
  },
);

export const deleteDeskCv = deskAction(async (id: string): Promise<void> => {
  "use server";

  const desk = await import("../../server/desk-cvs");

  await desk.deleteCv(id);
});

/** Gives a CV the primary role (the PDF) or the website role (/curriculum). */
export const markDeskCv = deskAction(
  async (id: string, role: "primary" | "website"): Promise<void> => {
    "use server";

    const desk = await import("../../server/desk-cvs");

    await desk.markRole(id, role);
  },
);

/**
 * How full each page of a CV's PDF is; a trial layout is printed and
 * shown, never stored. A plain server function, not a query or action: it runs
 * Chrome, and queries are refetched after desk actions.
 */
export async function checkCvPages({ id, trial }: { id: string; trial?: CvLayout | undefined }) {
  "use server";

  const { CvLayoutSchema } = await import("../../data/cv-print-layout");
  const { decodeUnknownEffect, runServerEffect } = await import("../../server/effect");
  const desk = await import("../../server/desk-cvs");

  const parsedTrial =
    trial === undefined
      ? undefined
      : await runServerEffect(decodeUnknownEffect(CvLayoutSchema, trial));

  return desk.checkPages(id, parsedTrial);
}

/**
 * A CV's printed content for /desk/cv-print/<id>, with trial steps when
 * given. One object argument, the trial field left out when there is none:
 * server function arguments travel as JSON, which can't carry undefined.
 */
export const getDeskCvPrint = query(async ({ id, trial }: { id: string; trial?: CvLayout }) => {
  "use server";

  const { CvLayoutSchema } = await import("../../data/cv-print-layout");
  const { decodeUnknownEffect, runServerEffect } = await import("../../server/effect");
  const desk = await import("../../server/desk-cvs");

  const parsedTrial =
    trial === undefined
      ? undefined
      : await runServerEffect(decodeUnknownEffect(CvLayoutSchema, trial));

  return desk.printForDesk(id, parsedTrial);
}, "desk-cv-print");

export type { CvInput };
