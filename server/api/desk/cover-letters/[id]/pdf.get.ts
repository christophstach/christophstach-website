import { defineEventHandler, getRouterParam, setResponseHeaders } from "h3";
import { renderPdf } from "../../../../utils/cv-pdf";
import { requireCoverLetter } from "../../../../utils/cover-letters";
import { slugify } from "../../../../../app/utils/cover-letter";

// Rendered per request for the signed-in desk user, never cached, so it always
// shows the current letter.
export default defineEventHandler(async (event) => {
  await requireUserSession(event);

  const { id, company } = await requireCoverLetter(getRouterParam(event, "id") ?? "");
  const pdf = await renderPdf(event, `/desk/cover-letter-print/${id}`, true);

  setResponseHeaders(event, {
    "Content-Type": "application/pdf",
    "Content-Disposition": `inline; filename="christoph-stach-cover-letter-${slugify(company)}.pdf"`,
    "Cache-Control": "private, no-store",
  });

  return pdf;
});
