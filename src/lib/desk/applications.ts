// The desk's application writes, as server functions. Arguments are typed for
// the caller and parsed again on the server.
import type { Application } from "../../data/applications";
import { query } from "@solidjs/router";

export async function saveDeskApplication(
  application: Application,
  options: { create: boolean },
): Promise<void> {
  "use server";

  const desk = await import("../../server/desk-applications");

  await desk.saveDeskApplication(application.id, application, options);
}

export async function deleteDeskApplication(id: string): Promise<void> {
  "use server";

  const desk = await import("../../server/desk-applications");

  await desk.deleteDeskApplication(id);
}

/** Freezes what the application sends now: its CV and cover letters as they print. */
export async function markDeskApplicationSent(id: string): Promise<void> {
  "use server";

  const desk = await import("../../server/desk-applications");

  await desk.markDeskApplicationSent(id);
}

/** The CV an application sent, as /desk/sent-print/<id> prints it. */
export const getDeskSentCv = query(async (id: string) => {
  "use server";

  const desk = await import("../../server/desk-applications");

  return desk.sentCv(id);
}, "desk-sent-cv");

/** A cover letter an application sent, as /desk/sent-print/<id>/<letter> prints it. */
export const getDeskSentLetter = query(async (id: string, letterId: string) => {
  "use server";

  const desk = await import("../../server/desk-applications");

  return desk.sentLetter(id, letterId);
}, "desk-sent-letter");
