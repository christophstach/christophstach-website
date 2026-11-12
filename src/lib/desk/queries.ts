// The desk's reads as router queries: cached per key, shared between a
// route's preload and its render, revalidated after desk writes. Each body
// runs on the server; the server-only module is imported inside it, so the
// client build never resolves it.
import type { deskCvs } from "../../server/desk-read";
import { query } from "@solidjs/router";

// What the reads answer, for components that pass their rows around (a
// type-only import of the server module: no runtime edge).
type DeskCvs = Awaited<ReturnType<typeof deskCvs>>;
type DeskCv = DeskCvs["cvs"][number];

export const getDeskCvs = query(async () => {
  "use server";

  const desk = await import("../../server/desk-read");

  return desk.deskCvs();
}, "desk-cvs");

export const getDeskApplications = query(async () => {
  "use server";

  const desk = await import("../../server/desk-read");

  return desk.deskApplications();
}, "desk-applications");

export const getDeskCoverLetters = query(async () => {
  "use server";

  const desk = await import("../../server/desk-read");

  return desk.deskCoverLetters();
}, "desk-cover-letters");

export const getDeskContent = query(async () => {
  "use server";

  const desk = await import("../../server/desk-read");

  return desk.deskContent();
}, "desk-cv-content");

export const getDeskProfile = query(async () => {
  "use server";

  const desk = await import("../../server/desk-read");

  return desk.deskProfile();
}, "desk-profile");

export const getDeskProjects = query(async () => {
  "use server";

  const desk = await import("../../server/desk-read");

  return desk.deskProjects();
}, "desk-projects");

export const getDeskPostings = query(async () => {
  "use server";

  const desk = await import("../../server/desk-read");

  return desk.deskPostings();
}, "desk-postings");

export const getDeskCollectors = query(async () => {
  "use server";

  const desk = await import("../../server/desk-read");

  return desk.deskCollectors();
}, "desk-collectors");

export const getDeskCompanies = query(async () => {
  "use server";

  const desk = await import("../../server/desk-read");

  return desk.deskCompanies();
}, "desk-companies");

/** What the desk looks for (the scoring model's brief), and that model. */
export const getDeskJobSearch = query(async () => {
  "use server";

  const desk = await import("../../server/desk-postings");

  return desk.deskJobSearch();
}, "desk-job-search");

export const getDeskUser = query(async () => {
  "use server";

  const desk = await import("../../server/desk-read");

  return desk.requireUser();
}, "desk-user");

export type { DeskCv, DeskCvs };
