import type { APIHandler } from "filesystem-routing/api";
import { paths } from "../router";
import { renderPdf } from "../server/cv-pdf";

// The public CV PDF: the primary variant, printed from /cv-print on request so
// it always matches the CV data. On Vercel the response is cached (ISR), so
// Chrome runs once per deployment or desk change, not once per download.
export const GET: APIHandler = async (event) => {
  const pdf = await renderPdf(event.request, paths["cv-print"]());

  // A copy on a plain ArrayBuffer, which a Response body needs.
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="christoph-stach-cv.pdf"',
    },
  });
};
