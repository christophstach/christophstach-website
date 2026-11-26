// The desk's posting and collector writes, as server functions. Arguments are
// typed for the caller and parsed again on the server.
import type { AtsBoard, CollectorType, PostingEdit, PostingStatus } from "../../data/postings";
import { deskAction } from "./mutation";

/** Reads the job ad at an address into the inbox; answers its posting's id. */
export const addDeskPostingByUrl = deskAction(async (url: string): Promise<string> => {
  "use server";

  const desk = await import("../../server/desk-postings");

  return desk.addDeskPostingByUrl(url);
});

export const saveDeskPosting = deskAction(async (id: string, edit: PostingEdit): Promise<void> => {
  "use server";

  const desk = await import("../../server/desk-postings");

  await desk.saveDeskPosting(id, edit);
});

export const setDeskPostingsStatus = deskAction(
  async (ids: string[], status: PostingStatus): Promise<void> => {
    "use server";

    const desk = await import("../../server/desk-postings");

    await desk.setDeskPostingsStatus({ ids, status });
  },
);

export const deleteDeskPosting = deskAction(async (id: string): Promise<void> => {
  "use server";

  const desk = await import("../../server/desk-postings");

  await desk.deleteDeskPosting(id);
});

/** Makes an application from a posting; answers the application's id. */
export const applyToDeskPosting = deskAction(async (id: string): Promise<string> => {
  "use server";

  const desk = await import("../../server/desk-postings");

  return desk.applyToDeskPosting(id);
});

/**
 * Makes a collector; answers its secret, which only this answer shows, or ""
 * for one the desk runs itself. A job board collector takes its board.
 */
export const createDeskCollector = deskAction(
  async (
    id: string,
    collector: { type: CollectorType; label: string; board?: AtsBoard },
  ): Promise<string> => {
    "use server";

    const desk = await import("../../server/desk-postings");

    return desk.createDeskCollector(id, collector);
  },
);

export const updateDeskCollector = deskAction(
  async (
    id: string,
    change: { label: string; active: boolean; board?: AtsBoard },
  ): Promise<void> => {
    "use server";

    const desk = await import("../../server/desk-postings");

    await desk.updateDeskCollector(id, change);
  },
);

/** Reads a job board collector's board now; answers what it found. */
export const runDeskCollector = deskAction(
  async (id: string): Promise<{ found: number; added: number; closed: number }> => {
    "use server";

    const desk = await import("../../server/desk-postings");

    return desk.runDeskCollector(id);
  },
);

/** Replaces a collector's secret; answers the new one. */
export const renewDeskCollectorSecret = deskAction(async (id: string): Promise<string> => {
  "use server";

  const desk = await import("../../server/desk-postings");

  return desk.renewDeskCollectorSecret(id);
});

export const deleteDeskCollector = deskAction(async (id: string): Promise<void> => {
  "use server";

  const desk = await import("../../server/desk-postings");

  await desk.deleteDeskCollector(id);
});

/** Reads a collector's postings again from what it was sent; answers how many. */
export const rereadDeskCollector = deskAction(async (id: string): Promise<number> => {
  "use server";

  const desk = await import("../../server/desk-postings");

  return desk.rereadDeskCollector(id);
});

/** How a scoring run went: what it scored, why it stopped, what is left. */
export interface DeskScoreRun {
  model: string;
  scored: string[];
  error: string;
  left: number;
}

/** Scores one posting now, also if it has a score. */
export const scoreDeskPosting = deskAction(async (id: string): Promise<DeskScoreRun> => {
  "use server";

  const desk = await import("../../server/desk-postings");

  return desk.scoreDeskPosting(id);
});

/** Scores the postings due for it, for about a minute. */
export const scoreDeskPostings = deskAction(async (): Promise<DeskScoreRun> => {
  "use server";

  const desk = await import("../../server/desk-postings");

  return desk.scoreDeskPostings();
});

/** Writes what the desk looks for; older scores count as stale. */
export const saveDeskJobSearch = deskAction(async (notes: string): Promise<void> => {
  "use server";

  const desk = await import("../../server/desk-postings");

  await desk.saveDeskJobSearch(notes);
});
