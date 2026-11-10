import type { APIHandler } from "filesystem-routing/api";
import { HttpError } from "../../../../server/http";
import { renderPdf } from "../../../../server/cv-pdf";
import { requireUser } from "../../../../server/auth";
import { requireVariant } from "../../../../server/cv-variants";

// A private CV variant as a PDF, printed from its desk page with the
// requester's session. Never cached.
export const GET: APIHandler = async (event) => {
  try {
    await requireUser(event.request);

    const { id } = await requireVariant(event.params?.variant ?? "");
    const pdf = await renderPdf(event.request, `/desk/cv-print/${id}`, true);

    // A copy on a plain ArrayBuffer, which a Response body needs.
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="christoph-stach-cv-${id}.pdf"`,
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
