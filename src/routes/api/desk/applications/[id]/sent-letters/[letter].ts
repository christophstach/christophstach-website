import type { APIHandler } from "filesystem-routing/api";
import { HttpError } from "../../../../../../server/http";
import { paths } from "../../../../../../router";
import { renderPdf } from "../../../../../../server/cv-pdf";
import { requireSentCopy } from "../../../../../../server/sent-copies";
import { requireUser } from "../../../../../../server/auth";

// A cover letter an application sent, as a PDF of how it printed then. Never cached.
export const GET: APIHandler = async (event) => {
  try {
    await requireUser(event.request);

    const id = event.params?.id ?? "";
    const letter = event.params?.letter ?? "";

    if (!(await requireSentCopy(id)).letters.some((sent) => sent.id === letter)) {
      throw new HttpError(404, `Application "${id}" sent no cover letter "${letter}".`);
    }

    const pdf = await renderPdf(event.request, paths.desk["sent-print"](id, letter)(), true);

    // A copy on a plain ArrayBuffer, which a Response body needs.
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="christoph-stach-cover-letter-${letter}.pdf"`,
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
