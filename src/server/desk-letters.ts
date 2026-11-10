import "server-only";
import {
  deleteCoverLetter,
  printCoverLetter,
  requireCoverLetter,
  saveCoverLetter,
  storeCoverLetterFills,
} from "./cover-letters";
import { pageFills, points } from "./pdf-pages";
import { COVER_LETTER_MARGIN_MM } from "../data/cover-letter-wording";
import { currentRequest } from "./desk-write";
import { parseCoverLetterBody } from "./cover-letter-body";
import { paths } from "../router";
import { renderPdf } from "./cv-pdf";
import { requireUser } from "./auth";

// The desk's cover letter writes, prints and page checks. Each checks the
// session first and parses its input.

async function saveLetter(id: string, body: unknown, { create }: { create: boolean }) {
  await requireUser();

  const letter = parseCoverLetterBody(id, body);

  await saveCoverLetter(letter, { create });

  return letter;
}

async function deleteLetter(id: string) {
  await requireUser();
  await deleteCoverLetter(id);
}

async function printLetter(id: string) {
  await requireUser();

  return printCoverLetter(id);
}

/** How full each page of the letter's PDF is; stored with the letter. */
async function checkLetterPages(id: string) {
  await requireUser();

  const letter = await requireCoverLetter(id);
  const pdf = await renderPdf(
    currentRequest(),
    paths.desk["cover-letter-print"](letter.id)(),
    true,
  );
  const pages = await pageFills(pdf, points(COVER_LETTER_MARGIN_MM));

  await storeCoverLetterFills(
    letter.id,
    pages.map((page) => page.fill),
  );

  return { pages };
}

export { checkLetterPages, deleteLetter, printLetter, saveLetter };
