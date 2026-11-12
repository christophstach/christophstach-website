import type { APIHandler } from "filesystem-routing/api";
import { HttpError } from "../../../server/http";
import { receive } from "../../../server/collector-store";

// Where a collector is sent job postings, e.g. by the script in Gmail that
// forwards LinkedIn's job alerts (tools/linkedin-alerts.gs). Guarded by the
// collector's own secret (`Authorization: Bearer <secret>`) instead of a
// desk session. Answers how many postings it found and how many were new.
export const POST: APIHandler = async (event) => {
  try {
    const run = await receive(event.params?.id ?? "", event.request);

    return Response.json(run, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof HttpError) {
      return new Response(error.message, { status: error.status });
    }

    throw error;
  }
};
