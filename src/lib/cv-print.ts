import type { PrintedCv } from "./cv";
import { query } from "@solidjs/router";

/** The public CV: the primary CV, which /christoph-stach-cv.pdf prints. */
export const getPrimaryCv = query(async (): Promise<PrintedCv> => {
  "use server";

  const [{ Effect }, { printStoredCvEffect, requireMarkedCvEffect }, { runServerEffect }] =
    await Promise.all([import("effect"), import("../server/cvs"), import("../server/effect")]);

  return runServerEffect(
    requireMarkedCvEffect("isPrimary").pipe(Effect.flatMap(printStoredCvEffect)),
  );
}, "cv-print");
