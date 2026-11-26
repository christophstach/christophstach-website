// The desk's CV content reads and writes, as server functions. Arguments are
// typed for the caller and parsed again on the server; writes run inside
// `deskAction` (`action()`) so the router revalidates the desk's queries in a
// single flight.
import type { EntryRecord, Profile, SkillGroupRecord } from "../../data/cv";
import type { ProjectRecord } from "../../data/projects";
import { query } from "@solidjs/router";
import { deskAction } from "./mutation";

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

export const saveDeskEntry = deskAction(
  async (entry: EntryRecord, options: { create: boolean }): Promise<EntryRecord> => {
    "use server";

    const desk = await import("../../server/desk-write");

    return desk.saveEntry(entry.id, entry, options);
  },
);

export const deleteDeskEntry = deskAction(async (id: string): Promise<void> => {
  "use server";

  const desk = await import("../../server/desk-write");

  await desk.deleteEntry(id);
});

export const saveDeskSkillGroups = deskAction(
  async (groups: SkillGroupRecord[]): Promise<SkillGroupRecord[]> => {
    "use server";

    const desk = await import("../../server/desk-write");

    return desk.saveSkillGroups(groups);
  },
);

export const saveDeskProfile = deskAction(async (profile: Profile): Promise<Profile> => {
  "use server";

  const desk = await import("../../server/desk-write");

  return desk.saveProfile(profile);
});

export const saveDeskProject = deskAction(
  async (project: ProjectRecord, options: { create: boolean }): Promise<ProjectRecord> => {
    "use server";

    const desk = await import("../../server/desk-write");

    return desk.saveProject(project.id, project, options);
  },
);

export const deleteDeskProject = deskAction(async (id: string): Promise<void> => {
  "use server";

  const desk = await import("../../server/desk-write");

  await desk.deleteProject(id);
});
