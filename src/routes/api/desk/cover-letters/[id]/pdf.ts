import { Effect } from "effect";
import type { APIHandler } from "filesystem-routing/api";
import { slugify } from "../../../../../lib/cover-letter";
import { paths } from "../../../../../router";
import { findApplicationEffect } from "../../../../../server/applications";
import { requireUserEffect } from "../../../../../server/auth";
import { requireCoverLetterEffect } from "../../../../../server/cover-letters";
import { renderPdfEffect } from "../../../../../server/cv-pdf";
import { runApiEffect } from "../../../../../server/effect";

// A cover letter as a PDF, printed from its desk page with the requester's
// session. Never cached.
export const GET: APIHandler = (event) =>
  runApiEffect(
    Effect.gen(function* () {
      yield* requireUserEffect(event.request);

      const { id, applicationId } = yield* requireCoverLetterEffect(event.params?.id ?? "");
      // Named after the company, as the file goes out with the application.
      const application = yield* findApplicationEffect(applicationId);
      const company = application?.company ?? id;
      const pdf = yield* renderPdfEffect(
        event.request,
        paths.desk["cover-letter-print"](id)(),
        true,
      );

      // A copy on a plain ArrayBuffer, which a Response body needs.
      return new Response(new Uint8Array(pdf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="christoph-stach-cover-letter-${slugify(company)}.pdf"`,
          "Cache-Control": "private, no-store",
        },
      });
    }),
  );
