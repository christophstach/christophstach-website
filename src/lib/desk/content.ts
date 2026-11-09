// The desk's CV content reads and writes, as server functions. Arguments are
// typed for the caller and parsed again on the server; after a write settles,
// the router revalidates the desk's queries.
import type { EntryRecord, Profile, SkillGroupRecord } from "../../data/cv";
import type { ProjectRecord } from "../../data/projects";
import { query } from "@solidjs/router";

export const getDeskEntry = query(async (id: string) => {
  "use server";

  const desk = await import("../../server/desk-write");

  return desk.entry(id);
}, "desk-cv-entry");

export const getDeskProject = query(async (id: string) => {
  "use server";

  const desk = await import("../../server/desk-write");

  return desk.project(id);
}, "desk-project");

export async function saveDeskEntry(
  entry: EntryRecord,
  options: { create: boolean },
): Promise<EntryRecord> {
  "use server";

  const desk = await import("../../server/desk-write");

  return desk.saveEntry(entry.id, entry, options);
}

export async function deleteDeskEntry(id: string): Promise<void> {
  "use server";

  const desk = await import("../../server/desk-write");

  await desk.deleteEntry(id);
}

export async function saveDeskSkillGroups(groups: SkillGroupRecord[]): Promise<SkillGroupRecord[]> {
  "use server";

  const desk = await import("../../server/desk-write");

  return desk.saveSkillGroups(groups);
}

export async function saveDeskProfile(profile: Profile): Promise<Profile> {
  "use server";

  const desk = await import("../../server/desk-write");

  return desk.saveProfile(profile);
}

export async function saveDeskProject(
  project: ProjectRecord,
  options: { create: boolean },
): Promise<ProjectRecord> {
  "use server";

  const desk = await import("../../server/desk-write");

  return desk.saveProject(project.id, project, options);
}

export async function deleteDeskProject(id: string): Promise<void> {
  "use server";

  const desk = await import("../../server/desk-write");

  await desk.deleteProject(id);
}
