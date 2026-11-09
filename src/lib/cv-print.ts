import type { PrintedCv } from "./cv-variant";
import { query } from "@solidjs/router";

/** The public CV: the primary variant, which /christoph-stach-cv.pdf prints. */
export const getPrimaryCv = query(async (): Promise<PrintedCv> => {
  "use server";

  const { printStoredVariant, requireMarkedVariant } = await import("../server/cv-variants");

  return printStoredVariant(await requireMarkedVariant("isPrimary"));
}, "cv-print");
