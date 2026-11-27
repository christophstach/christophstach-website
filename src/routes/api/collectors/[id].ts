import { Effect } from "effect";
import type { APIHandler } from "filesystem-routing/api";
import { receiveEffect } from "../../../server/collector-store";
import { runApiEffect } from "../../../server/effect";

// Where a collector is sent job postings, e.g. by the script in Gmail that
// forwards LinkedIn's job alerts (tools/linkedin-alerts.gs). Guarded by the
// collector's own secret (`Authorization: Bearer <secret>`) instead of a
// desk session. Answers how many postings it found and how many were new.
export const POST: APIHandler = (event) =>
  runApiEffect(
    receiveEffect(event.params?.id ?? "", event.request).pipe(
      Effect.map((run) =>
        Response.json(run, { headers: { "Cache-Control": "private, no-store" } }),
      ),
    ),
  );
