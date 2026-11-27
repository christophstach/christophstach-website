import { Effect } from "effect";
import type { APIHandler } from "filesystem-routing/api";
import { paths } from "../../../../../../router";
import { requireUserEffect } from "../../../../../../server/auth";
import { renderPdfEffect } from "../../../../../../server/cv-pdf";
import { NotFoundError, runApiEffect } from "../../../../../../server/effect";
import { requireSentCopyEffect } from "../../../../../../server/sent-copies";

// A cover letter an application sent, as a PDF of how it printed then. Never cached.
export const GET: APIHandler = (event) =>
  runApiEffect(
    Effect.gen(function* () {
      yield* requireUserEffect(event.request);

      const id = event.params?.id ?? "";
      const letter = event.params?.letter ?? "";
      const sent = yield* requireSentCopyEffect(id);

      if (!sent.letters.some((copy) => copy.id === letter)) {
        return yield* new NotFoundError({
          message: `Application "${id}" sent no cover letter "${letter}".`,
        });
      }

      const pdf = yield* renderPdfEffect(
        event.request,
        paths.desk["sent-print"](id, letter)(),
        true,
      );

      // A copy on a plain ArrayBuffer, which a Response body needs.
      return new Response(new Uint8Array(pdf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="christoph-stach-cover-letter-${letter}.pdf"`,
          "Cache-Control": "private, no-store",
        },
      });
    }),
  );
