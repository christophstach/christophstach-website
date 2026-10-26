import { createError, defineEventHandler, getRouterParam, setResponseHeaders } from "h3";
import { cvVariants } from "../../../../app/data/cv-variants";
import { renderPdf } from "../../../utils/cv-pdf";

// requireUserSession is a Nitro auto-import (see server/routes/auth/github.get.ts).
// Variant PDFs are private: rendered per request for the signed-in desk user,
// never cached, so they always show the current data.
export default defineEventHandler(async (event) => {
  await requireUserSession(event);

  const id = getRouterParam(event, "variant") ?? "";

  if (!cvVariants.some((variant) => variant.id === id)) {
    throw createError({ statusCode: 404, message: `No CV variant "${id}".` });
  }

  const pdf = await renderPdf(event, `/desk/cv-print/${id}`, true);

  setResponseHeaders(event, {
    "Content-Type": "application/pdf",
    "Content-Disposition": `inline; filename="christoph-stach-cv-${id}.pdf"`,
    "Cache-Control": "private, no-store",
  });

  return pdf;
});
