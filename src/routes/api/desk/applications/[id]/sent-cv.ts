import type { APIHandler } from "filesystem-routing/api";
import { HttpError } from "../../../../../server/http";
import { paths } from "../../../../../router";
import { renderPdf } from "../../../../../server/cv-pdf";
import { requireSentCopy } from "../../../../../server/sent-copies";
import { requireUser } from "../../../../../server/auth";

// The CV an application sent, as a PDF of how it printed then. Never cached.
export const GET: APIHandler = async (event) => {
  try {
    await requireUser(event.request);

    const id = event.params?.id ?? "";

    if ((await requireSentCopy(id)).cv === null) {
      throw new HttpError(404, `Application "${id}" sent no CV.`);
    }

    const pdf = await renderPdf(event.request, paths.desk["sent-print"](id)(), true);

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
