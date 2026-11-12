// The desk's posting and collector writes, as server functions. Arguments are
// typed for the caller and parsed again on the server.
import type { CollectorType, PostingEdit, PostingStatus } from "../../data/postings";

/** Reads the job ad at an address into the inbox; answers its posting's id. */
export async function addDeskPostingByUrl(url: string): Promise<string> {
  "use server";

  const desk = await import("../../server/desk-postings");

  return desk.addDeskPostingByUrl(url);
}

export async function saveDeskPosting(id: string, edit: PostingEdit): Promise<void> {
  "use server";

  const desk = await import("../../server/desk-postings");

  await desk.saveDeskPosting(id, edit);
}

export async function setDeskPostingsStatus(ids: string[], status: PostingStatus): Promise<void> {
  "use server";

  const desk = await import("../../server/desk-postings");

  await desk.setDeskPostingsStatus({ ids, status });
}

export async function deleteDeskPosting(id: string): Promise<void> {
  "use server";

  const desk = await import("../../server/desk-postings");

  await desk.deleteDeskPosting(id);
}

/** Makes an application from a posting; answers the application's id. */
export async function applyToDeskPosting(id: string): Promise<string> {
  "use server";

  const desk = await import("../../server/desk-postings");

  return desk.applyToDeskPosting(id);
}

/** Makes a collector; answers its secret, which only this answer shows. */
export async function createDeskCollector(
  id: string,
  collector: { type: CollectorType; label: string },
): Promise<string> {
  "use server";

  const desk = await import("../../server/desk-postings");

  return desk.createDeskCollector(id, collector);
}

export async function updateDeskCollector(
  id: string,
  change: { label: string; active: boolean },
): Promise<void> {
  "use server";

  const desk = await import("../../server/desk-postings");

  await desk.updateDeskCollector(id, change);
}

/** Replaces a collector's secret; answers the new one. */
export async function renewDeskCollectorSecret(id: string): Promise<string> {
  "use server";

  const desk = await import("../../server/desk-postings");

  return desk.renewDeskCollectorSecret(id);
}

export async function deleteDeskCollector(id: string): Promise<void> {
  "use server";

  const desk = await import("../../server/desk-postings");

  await desk.deleteDeskCollector(id);
}

/** Reads a collector's postings again from what it was sent; answers how many. */
export async function rereadDeskCollector(id: string): Promise<number> {
  "use server";

  const desk = await import("../../server/desk-postings");

  return desk.rereadDeskCollector(id);
}
