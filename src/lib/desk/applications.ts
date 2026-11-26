// The desk's application writes, as server functions. Arguments are typed for
// the caller and parsed again on the server.
import type { Application } from "../../data/applications";
import { query } from "@solidjs/router";
import { deskAction } from "./mutation";

export const saveDeskApplication = deskAction(
  async (application: Application, options: { create: boolean }): Promise<void> => {
    "use server";

    const desk = await import("../../server/desk-applications");

    await desk.saveDeskApplication(application.id, application, options);
  },
);

export const deleteDeskApplication = deskAction(async (id: string): Promise<void> => {
  "use server";

  const desk = await import("../../server/desk-applications");

  await desk.deleteDeskApplication(id);
});

/**
 * Settles an application's next step: "done" moves it into the history,
 * "later" moves it three days on. `today` is the browser's day.
 */
export const settleDeskNextStep = deskAction(
  async (id: string, settle: { action: "done" | "later"; today: string }): Promise<void> => {
    "use server";

    const desk = await import("../../server/desk-applications");

    await desk.settleDeskNextStep(id, settle);
  },
);

/** Freezes what the application sends now: its CV and cover letters as they print. */
export const markDeskApplicationSent = deskAction(async (id: string): Promise<void> => {
  "use server";

  const desk = await import("../../server/desk-applications");

  await desk.markDeskApplicationSent(id);
});

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
