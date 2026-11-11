import "server-only";
import { listEntries, listSkillGroups, loadProfile } from "./cv-content";
import { listCoverLetters } from "./cover-letters";
import { listProjects } from "./projects";
import { listCvs } from "./cvs";

import { requireUser } from "./auth";

// The desk's reads. Each checks the session first: the page guard doesn't
// cover server functions, which anyone can call.

async function deskCvs() {
  await requireUser();

  return listCvs();
}

async function deskCoverLetters() {
  await requireUser();

  return listCoverLetters();
}

async function deskContent() {
  await requireUser();

  const [entries, skills] = await Promise.all([listEntries(), listSkillGroups()]);

  return { entries, skills };
}

async function deskProfile() {
  await requireUser();

  return loadProfile();
}

async function deskProjects() {
  await requireUser();

  return listProjects();
}

export { deskContent, deskCoverLetters, deskProfile, deskProjects, deskCvs };
export { requireUser } from "./auth";
