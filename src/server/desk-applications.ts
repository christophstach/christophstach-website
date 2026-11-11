import "server-only";
import { deleteApplication, saveApplication } from "./applications";
import { parseApplicationBody } from "./application-body";
import { requireUser } from "./auth";

// The desk's application writes. Each checks the session first and parses
// its input. Applications are private: no public page to renew.

async function saveDeskApplication(id: string, body: unknown, { create }: { create: boolean }) {
  await requireUser();

  const application = parseApplicationBody(id, body);

  await saveApplication(application, { create });

  return application;
}

async function deleteDeskApplication(id: string) {
  await requireUser();
  await deleteApplication(id);
}

export { deleteDeskApplication, saveDeskApplication };
