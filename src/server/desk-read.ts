import "server-only";
import { listEntries, listSkillGroups, loadProfile } from "./cv-content";
import { listApplications } from "./applications";
import { listCoverLetters } from "./cover-letters";
import { listCollectors } from "./collector-store";
import { listCompanies } from "./companies";
import { listPostings } from "./postings";
import { listProjects } from "./projects";
import { listCvs } from "./cvs";

import { requireUser } from "./auth";

// The desk's reads. Each checks the session first: the page guard doesn't
// cover server functions, which anyone can call.

async function deskCvs() {
  await requireUser();

  return listCvs();
}

async function deskApplications() {
  await requireUser();

  return listApplications();
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

async function deskPostings() {
  await requireUser();

  return listPostings();
}

async function deskCompanies() {
  await requireUser();

  return listCompanies();
}

async function deskCollectors() {
  await requireUser();

  return listCollectors();
}

export {
  deskApplications,
  deskCollectors,
  deskCompanies,
  deskContent,
  deskCoverLetters,
  deskCvs,
  deskPostings,
  deskProfile,
  deskProjects,
};
export { requireUser } from "./auth";
