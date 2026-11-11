import type { APIHandler } from "filesystem-routing/api";
import { HttpError } from "../../../server/http";
import { checkMissingPages } from "../../../server/page-check-job";

// The scheduled page check (Vercel Cron, see vite.config.ts): measures the CV
// variants and cover letters that have no page check on this build. Guarded by
// CRON_SECRET instead of a desk session.
export const GET: APIHandler = async (event) => {
  try {
    const run = await checkMissingPages(event.request);

    return Response.json(run, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof HttpError) {
      return new Response(error.message, { status: error.status });
    }

    throw error;
  }
};
