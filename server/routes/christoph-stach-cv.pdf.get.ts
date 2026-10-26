// The public CV PDF: the primary variant, printed from the prerendered /cv-print
// page on request so it always matches the CV data. On Vercel the response is
// cached (ISR, see routeRules), so Chrome only runs once per deployment, not
// once per download.
import { defineEventHandler, setResponseHeaders } from "h3";
import { renderPdf } from "../utils/cv-pdf";

export default defineEventHandler(async (event) => {
  const pdf = await renderPdf(event, "/cv-print");

  setResponseHeaders(event, {
    "Content-Type": "application/pdf",
    "Content-Disposition": 'inline; filename="christoph-stach-cv.pdf"',
  });

  return pdf;
});
