import { Effect } from "effect";
import type { APIHandler } from "filesystem-routing/api";
import { paths } from "../../../../router";
import { requireUserEffect } from "../../../../server/auth";
import { renderPdfEffect } from "../../../../server/cv-pdf";
import { requireCvEffect } from "../../../../server/cvs";
import { runApiEffect } from "../../../../server/effect";

// A private CV as a PDF, printed from its desk page with the
// requester's session. Never cached.
export const GET: APIHandler = (event) =>
  runApiEffect(
    Effect.gen(function* () {
      yield* requireUserEffect(event.request);

      const { id } = yield* requireCvEffect(event.params?.id ?? "");
      const pdf = yield* renderPdfEffect(event.request, paths.desk["cv-print"](id)(), true);

      // A copy on a plain ArrayBuffer, which a Response body needs.
      return new Response(new Uint8Array(pdf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="christoph-stach-cv-${id}.pdf"`,
          "Cache-Control": "private, no-store",
        },
      });
    }),
  );
