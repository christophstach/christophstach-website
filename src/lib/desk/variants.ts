// The desk's CV variant writes, prints and page checks, as server functions.
// Arguments are typed for the caller and parsed again on the server.
import type { CvLayout } from "../../data/cv-print-layout";
import type { CvVariant } from "../../data/cv-variants";
import { query } from "@solidjs/router";

/** A variant as the editor saves it. */
type VariantInput = Omit<CvVariant, "id">;

export async function saveDeskVariant(
  id: string,
  variant: VariantInput,
  options: { create: boolean },
): Promise<void> {
  "use server";

  const desk = await import("../../server/desk-variants");

  await desk.saveVariant(id, variant, options);
}

export async function deleteDeskVariant(id: string): Promise<void> {
  "use server";

  const desk = await import("../../server/desk-variants");

  await desk.deleteVariant(id);
}

/** Gives a variant the primary role (the PDF) or the website role (/curriculum). */
export async function markDeskVariant(id: string, role: "primary" | "website"): Promise<void> {
  "use server";

  const desk = await import("../../server/desk-variants");

  await desk.markRole(id, role);
}

/**
 * How full each page of a variant's PDF is; a trial layout is printed and
 * shown, never stored. A plain server function, not a query: it runs Chrome,
 * and queries are refetched after every server function call.
 */
export async function checkVariantPages({
  id,
  trial,
}: {
  id: string;
  trial?: CvLayout | undefined;
}) {
  "use server";

  const { cvLayoutSchema } = await import("../../data/cv-print-layout");
  const { parseInput } = await import("../../server/input");
  const desk = await import("../../server/desk-variants");

  return desk.checkPages(id, trial === undefined ? undefined : parseInput(cvLayoutSchema, trial));
}

/**
 * A variant's printed content for /desk/cv-print/<id>, with trial steps when
 * given. One object argument, the trial field left out when there is none:
 * server function arguments travel as JSON, which can't carry undefined.
 */
export const getDeskVariantPrint = query(
  async ({ id, trial }: { id: string; trial?: CvLayout }) => {
    "use server";

    const { cvLayoutSchema } = await import("../../data/cv-print-layout");
    const { parseInput } = await import("../../server/input");
    const desk = await import("../../server/desk-variants");

    return desk.printForDesk(
      id,
      trial === undefined ? undefined : parseInput(cvLayoutSchema, trial),
    );
  },
  "desk-cv-print",
);

export type { VariantInput };
