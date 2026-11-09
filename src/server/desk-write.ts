import "server-only";
import { allPublicPaths, publicPaths } from "./cv-public-paths";
import {
  deleteEntry as deleteStoredEntry,
  requireEntry,
  saveEntry as saveStoredEntry,
  saveProfile as saveStoredProfile,
  saveSkillGroups as saveStoredSkillGroups,
} from "./cv-content";
import {
  deleteProject as deleteStoredProject,
  requireProject,
  saveProject as saveStoredProject,
} from "./projects";
import { parseEntryBody, parseProfileBody, parseSkillGroupsBody } from "./cv-content-body";
import { HttpError } from "./http";
import { getRequestEvent } from "@solidjs/web";
import { parseProjectBody } from "./project-body";
import { requireUser } from "./auth";
import { revalidatePaths } from "./cv-pdf";

// The desk's CV content writes. Each checks the session, parses its input
// (a server function's arguments come from outside like a request body) and
// renews the cached public responses the change can reach.

function currentRequest(): Request {
  const event = getRequestEvent();

  if (event === undefined) {
    throw new HttpError(500, "No request.");
  }

  return event.request;
}

async function entry(id: string) {
  await requireUser();

  return requireEntry(id);
}

async function saveEntry(id: string, body: unknown, { create }: { create: boolean }) {
  await requireUser();

  const parsed = parseEntryBody(id, body);

  await saveStoredEntry(parsed, { create });
  await revalidatePaths(currentRequest(), allPublicPaths());

  return parsed;
}

async function deleteEntry(id: string) {
  await requireUser();
  await deleteStoredEntry(id);
  await revalidatePaths(currentRequest(), allPublicPaths());
}

async function saveSkillGroups(body: unknown) {
  await requireUser();

  const groups = parseSkillGroupsBody(body);

  await saveStoredSkillGroups(groups);
  await revalidatePaths(currentRequest(), allPublicPaths());

  return groups;
}

async function saveProfile(body: unknown) {
  await requireUser();

  const profile = parseProfileBody(body);

  await saveStoredProfile(profile);
  await revalidatePaths(currentRequest(), publicPaths({ primary: true, website: false }));

  return profile;
}

async function project(id: string) {
  await requireUser();

  return requireProject(id);
}

async function saveProject(id: string, body: unknown, { create }: { create: boolean }) {
  await requireUser();

  const parsed = parseProjectBody(id, body);

  await saveStoredProject(parsed, { create });

  // A new project isn't picked by any variant yet, so nothing public changes.
  if (!create) {
    await revalidatePaths(currentRequest(), publicPaths({ primary: true, website: true }));
  }

  return parsed;
}

async function deleteProject(id: string) {
  await requireUser();
  await deleteStoredProject(id);
  await revalidatePaths(currentRequest(), publicPaths({ primary: true, website: true }));
}

export {
  currentRequest,
  deleteEntry,
  deleteProject,
  entry,
  project,
  saveEntry,
  saveProfile,
  saveProject,
  saveSkillGroups,
};
