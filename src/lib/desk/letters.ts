// The desk's cover letter writes, prints and page checks, as server
// functions. Arguments are typed for the caller and parsed again on the server.
import type { CoverLetter } from "../../data/cover-letters";
import { query } from "@solidjs/router";

export async function saveDeskLetter(
  letter: CoverLetter,
  options: { create: boolean },
): Promise<void> {
  "use server";

  const desk = await import("../../server/desk-letters");

  await desk.saveLetter(letter.id, letter, options);
}

export async function deleteDeskLetter(id: string): Promise<void> {
  "use server";

  const desk = await import("../../server/desk-letters");

  await desk.deleteLetter(id);
}

/** How full each page of the letter's PDF is. Runs Chrome, so not a query. */
export async function checkDeskLetterPages(id: string) {
  "use server";

  const desk = await import("../../server/desk-letters");

  return desk.checkLetterPages(id);
}

/** A letter as /desk/cover-letter-print/<id> prints it. */
export const getDeskLetterPrint = query(async (id: string) => {
  "use server";

  const desk = await import("../../server/desk-letters");

  return desk.printLetter(id);
}, "desk-cover-letter-print");
