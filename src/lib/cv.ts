import { Data, Effect } from "effect";
import type { CvContent, Profile, SkillGroup, TimelineEntry } from "../data/cv";
import type { Cv, EntryPick } from "../data/cvs";
import type { Project } from "../data/projects";

// Relative imports: the server prints CVs with this too (server/utils).

/** A timeline entry as a CV prints it: its picked bullets, in order. */
type PrintedEntry = Omit<TimelineEntry, "bullets"> & { bullets: string[] };

/** Everything CvDocument renders for one CV. */
interface PrintedCv {
  profile: Profile;
  role: string;
  summary?: string;
  coreTechnologies: string[];
  experience: PrintedEntry[];
  education: PrintedEntry[];
  projects: Project[];
  skills: SkillGroup[];
  layout: Cv["layout"];
}

/** Raised when a CV references an entry, bullet, skill group, or project that does not exist. */
class CvPrintError extends Data.TaggedError("CvPrintError")<{
  readonly cvId: string;
  readonly kind: "entry" | "bullet" | "skill" | "project";
  readonly refId: string;
  readonly entryId?: string;
  readonly message: string;
}> {}

function pickEntriesEffect(
  cvId: string,
  entries: TimelineEntry[],
  picks: EntryPick[],
): Effect.Effect<PrintedEntry[], CvPrintError> {
  return Effect.gen(function* () {
    const picked: PrintedEntry[] = [];

    for (const pick of picks) {
      const entry = entries.find((candidate) => candidate.id === pick.id);

      if (!entry) {
        return yield* new CvPrintError({
          cvId,
          kind: "entry",
          refId: pick.id,
          message: `CV "${cvId}": no entry "${pick.id}".`,
        });
      }

      const bullets: string[] = [];

      for (const bulletId of pick.bullets) {
        const text = entry.bullets?.[bulletId];

        if (text === undefined) {
          return yield* new CvPrintError({
            cvId,
            kind: "bullet",
            refId: bulletId,
            entryId: pick.id,
            message: `CV "${cvId}": entry "${pick.id}" has no bullet "${bulletId}".`,
          });
        }

        bullets.push(text);
      }

      picked.push({ ...entry, bullets });
    }

    return picked;
  });
}

function pickSkillsEffect(cv: Cv, skills: SkillGroup[]): Effect.Effect<SkillGroup[], CvPrintError> {
  return Effect.gen(function* () {
    const picked: SkillGroup[] = [];

    for (const label of cv.skills) {
      const group = skills.find((candidate) => candidate.label === label);

      if (!group) {
        return yield* new CvPrintError({
          cvId: cv.id,
          kind: "skill",
          refId: label,
          message: `CV "${cv.id}": no skill group "${label}".`,
        });
      }

      picked.push(group);
    }

    return picked;
  });
}

function pickProjectsEffect(cv: Cv, projects: Project[]): Effect.Effect<Project[], CvPrintError> {
  return Effect.gen(function* () {
    const picked: Project[] = [];

    for (const id of cv.projects) {
      const project = projects.find((candidate) => candidate.id === id);

      if (!project) {
        return yield* new CvPrintError({
          cvId: cv.id,
          kind: "project",
          refId: id,
          message: `CV "${cv.id}": no project "${id}".`,
        });
      }

      picked.push(project);
    }

    return picked;
  });
}

/**
 * Resolves a CV's ids into the content it prints, failing with `CvPrintError`
 * on an unknown id. The content lives in the database, so the caller passes it in.
 */
function printCvEffect(cv: Cv, content: CvContent): Effect.Effect<PrintedCv, CvPrintError> {
  return Effect.gen(function* () {
    const experience = yield* pickEntriesEffect(cv.id, content.experience, cv.experience);
    const education = yield* pickEntriesEffect(cv.id, content.education, cv.education);
    const projects = yield* pickProjectsEffect(cv, content.projects);
    const skills = yield* pickSkillsEffect(cv, content.skills);

    return {
      profile: content.profile,
      role: cv.role,
      summary: cv.summary,
      coreTechnologies: cv.coreTechnologies,
      experience,
      education,
      projects,
      skills,
      layout: cv.layout,
    };
  });
}

/**
 * Resolves a CV's ids into the content it prints; throws on an unknown id.
 * The content lives in the database, so the caller passes it in.
 */
function printCv(cv: Cv, content: CvContent): PrintedCv {
  return Effect.runSync(printCvEffect(cv, content));
}

export type { PrintedCv, PrintedEntry };
export { CvPrintError, printCv, printCvEffect };
