import { Effect } from "effect";
import type { APIHandler } from "filesystem-routing/api";
import { paths } from "../router";
import { renderPdfEffect } from "../server/cv-pdf";
import { runApiEffect } from "../server/effect";

// The public CV PDF: the primary CV, printed from /cv-print on request so
// it always matches the CV data. On Vercel the response is cached (ISR), so
// Chrome runs once per deployment or desk change, not once per download.
export const GET: APIHandler = (event) =>
  runApiEffect(
    renderPdfEffect(event.request, paths["cv-print"]()).pipe(
      Effect.map(
        (pdf) =>
          // A copy on a plain ArrayBuffer, which a Response body needs.
          new Response(new Uint8Array(pdf), {
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": 'inline; filename="christoph-stach-cv.pdf"',
            },
          }),
      ),
    ),
  );
