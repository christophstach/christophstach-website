// The desk's application writes, as server functions. Arguments are typed for
// the caller and parsed again on the server.
import type { Application } from "../../data/applications";

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
