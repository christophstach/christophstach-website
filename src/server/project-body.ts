import "server-only";
import { object, optional } from "zod/mini";
import { parseInput, requireSlug, stringList, text, trimmed } from "./input";
import type { ProjectRecord } from "../data/projects";

const NOT_PROJECT = "Not a project.";

const projectSchema = object(
  {
    // A tab opened before names existed sends none: it falls back to the title.
    name: optional(text(NOT_PROJECT)),
    note: optional(trimmed(NOT_PROJECT)),
    title: text(NOT_PROJECT),
    description: trimmed(NOT_PROJECT),
    tech: stringList(NOT_PROJECT),
    url: trimmed(NOT_PROJECT),
  },
  NOT_PROJECT,
);

/** Checks the shape of a project sent by the desk; the route's id wins. */
function parseProjectBody(id: string, body: unknown): ProjectRecord {
  requireSlug(id);

  const project = parseInput(projectSchema, body ?? {});

  return {
    id,
    name: project.name ?? project.title,
    note: project.note ?? "",
    title: project.title,
    description: project.description,
    tech: project.tech,
    url: project.url,
  };
}

export { parseProjectBody };
