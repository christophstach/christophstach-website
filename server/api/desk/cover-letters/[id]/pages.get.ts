import { defineEventHandler, getRouterParam } from "h3";
import { pageFills, points } from "../../../../utils/pdf-pages";
import { requireCoverLetter, storeCoverLetterFills } from "../../../../utils/cover-letters";
import { COVER_LETTER_MARGIN_MM } from "../../../../../app/data/cover-letter-wording";
import { renderPdf } from "../../../../utils/cv-pdf";

// Prints the stored letter and measures its pages; the result is stored with it.
export default defineEventHandler(async (event) => {
  await requireUserSession(event);

  const { id } = await requireCoverLetter(getRouterParam(event, "id") ?? "");
  const pdf = await renderPdf(event, `/desk/cover-letter-print/${id}`, true);
  const pages = await pageFills(pdf, points(COVER_LETTER_MARGIN_MM));

  await storeCoverLetterFills(
    id,
    pages.map((page) => page.fill),
  );

  return { pages };
});
