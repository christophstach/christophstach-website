import { Effect } from "effect";
import type { APIHandler } from "filesystem-routing/api";
import { paths } from "../../../../../router";
import { requireUserEffect } from "../../../../../server/auth";
import { renderPdfEffect } from "../../../../../server/cv-pdf";
import { NotFoundError, runApiEffect } from "../../../../../server/effect";
import { requireSentCopyEffect } from "../../../../../server/sent-copies";

// The CV an application sent, as a PDF of how it printed then. Never cached.
export const GET: APIHandler = (event) =>
  runApiEffect(
    Effect.gen(function* () {
      yield* requireUserEffect(event.request);

      const id = event.params?.id ?? "";
      const sent = yield* requireSentCopyEffect(id);

      if (sent.cv === null) {
        return yield* new NotFoundError({ message: `Application "${id}" sent no CV.` });
      }

      const pdf = yield* renderPdfEffect(event.request, paths.desk["sent-print"](id)(), true);

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
