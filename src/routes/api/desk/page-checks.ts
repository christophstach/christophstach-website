import { Effect } from "effect";
import type { APIHandler } from "filesystem-routing/api";
import { runApiEffect } from "../../../server/effect";
import { runPageCheckJobEffect } from "../../../server/page-check-job";

// The scheduled page check (Vercel Cron, see vite.config.ts): measures the CV
// CVs and cover letters that have no page check on this build. Guarded by
// CRON_SECRET instead of a desk session.
export const GET: APIHandler = (event) =>
  runApiEffect(
    runPageCheckJobEffect(event.request).pipe(
      Effect.map((run) =>
        Response.json(run, { headers: { "Cache-Control": "private, no-store" } }),
      ),
    ),
  );
