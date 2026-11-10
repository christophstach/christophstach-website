import type { APIHandler } from "filesystem-routing/api";
import { HttpError } from "../../../../../server/http";
import { paths } from "../../../../../router";
import { renderPdf } from "../../../../../server/cv-pdf";
import { requireCoverLetter } from "../../../../../server/cover-letters";
import { requireUser } from "../../../../../server/auth";
import { slugify } from "../../../../../lib/cover-letter";

// A cover letter as a PDF, printed from its desk page with the requester's
// session. Never cached.
export const GET: APIHandler = async (event) => {
  try {
    await requireUser(event.request);

    const { id, company } = await requireCoverLetter(event.params?.id ?? "");
    const pdf = await renderPdf(event.request, paths.desk["cover-letter-print"](id)(), true);

    // A copy on a plain ArrayBuffer, which a Response body needs.
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="christoph-stach-cover-letter-${slugify(company)}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return new Response(error.message, { status: error.status });
    }

    throw error;
  }
};
