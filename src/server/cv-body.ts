import "server-only";
import { array, object, optional, string } from "zod/mini";
import { parseInput, requireSlug, stringList, text, trimmed } from "./input";
import type { Cv } from "../data/cvs";
import { cvLayoutSchema } from "../data/cv-print-layout";

/**
 * A CV as the desk sends it. A tab opened before a deploy may lack the
 * newer fields: no note counts as empty, no core technologies or layout keeps
 * the stored ones.
 */
type CvBody = Omit<Cv, "coreTechnologies" | "layout"> & {
  coreTechnologies?: Cv["coreTechnologies"];
  layout?: Cv["layout"];
};

const NOT_CV = "Not a CV.";

const idsSchema = array(string(NOT_CV), NOT_CV);
const pickSchema = object({ id: string(NOT_CV), bullets: idsSchema }, NOT_CV);
const picksSchema = array(pickSchema, NOT_CV);

const cvSchema = object(
  {
    label: text(NOT_CV),
    note: optional(trimmed(NOT_CV)),
    role: trimmed(NOT_CV),
    summary: trimmed(NOT_CV),
    coreTechnologies: optional(stringList(NOT_CV)),
    experience: picksSchema,
    education: picksSchema,
    projects: idsSchema,
    skills: idsSchema,
    layout: optional(cvLayoutSchema),
  },
  NOT_CV,
);

/**
 * Checks the shape of a CV sent by the desk; the route's id wins over
 * any id in the body. Whether its ids exist in the content is saveCv's check.
 */
function parseCvBody(id: string, body: unknown): CvBody {
  requireSlug(id);

  const { note, coreTechnologies, layout, ...cv } = parseInput(cvSchema, body ?? {});

  return {
    id,
    ...cv,
    note: note ?? "",
    ...(coreTechnologies === undefined ? {} : { coreTechnologies }),
    ...(layout === undefined ? {} : { layout }),
  };
}

export type { CvBody };
export { parseCvBody };
