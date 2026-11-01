import { defineEventHandler, getRouterParam, setResponseHeaders } from "h3";
import { renderPdf } from "../../../utils/cv-pdf";
import { requireVariant } from "../../../utils/cv-variants";

// requireUserSession is a Nitro auto-import (see server/routes/auth/github.get.ts).
// Variant PDFs are private: rendered per request for the signed-in desk user,
// never cached, so they always show the current data.
export default defineEventHandler(async (event) => {
  await requireUserSession(event);

  const { id } = await requireVariant(getRouterParam(event, "variant") ?? "");

  const pdf = await renderPdf(event, `/desk/cv-print/${id}`, true);

  setResponseHeaders(event, {
    "Content-Type": "application/pdf",
    "Content-Disposition": `inline; filename="christoph-stach-cv-${id}.pdf"`,
    "Cache-Control": "private, no-store",
  });

  return pdf;
});
