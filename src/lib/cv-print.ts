import type { PrintedCv } from "./cv";
import { query } from "@solidjs/router";

/** The public CV: the primary CV, which /christoph-stach-cv.pdf prints. */
export const getPrimaryCv = query(async (): Promise<PrintedCv> => {
  "use server";

  const { printStoredCv, requireMarkedCv } = await import("../server/cvs");

  return printStoredCv(await requireMarkedCv("isPrimary"));
}, "cv-print");
