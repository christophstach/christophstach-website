// The desk's reads as router queries: cached per key, shared between a
// route's preload and its render, revalidated after desk writes. Each body
// runs on the server; the server-only module is imported inside it, so the
// client build never resolves it.
import type { deskVariants } from "../../server/desk-read";
import { query } from "@solidjs/router";

// What the reads answer, for components that pass their rows around (a
// type-only import of the server module: no runtime edge).
type DeskVariants = Awaited<ReturnType<typeof deskVariants>>;
type DeskVariant = DeskVariants["variants"][number];

export const getDeskVariants = query(async () => {
  "use server";

  const desk = await import("../../server/desk-read");

  return desk.deskVariants();
}, "desk-cv-variants");

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

export const getDeskUser = query(async () => {
  "use server";

  const desk = await import("../../server/desk-read");

  return desk.requireUser();
}, "desk-user");

export type { DeskVariant, DeskVariants };
