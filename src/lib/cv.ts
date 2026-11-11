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

function pickEntries(cvId: string, entries: TimelineEntry[], picks: EntryPick[]) {
  return picks.map((pick): PrintedEntry => {
    const entry = entries.find((candidate) => candidate.id === pick.id);

    if (!entry) {
      throw new Error(`CV "${cvId}": no entry "${pick.id}".`);
    }

    const bullets = pick.bullets.map((bulletId) => {
      const text = entry.bullets?.[bulletId];

      if (text === undefined) {
        throw new Error(`CV "${cvId}": entry "${pick.id}" has no bullet "${bulletId}".`);
      }

      return text;
    });

    return { ...entry, bullets };
  });
}

function pickSkills(cv: Cv, skills: SkillGroup[]): SkillGroup[] {
  return cv.skills.map((label) => {
    const group = skills.find((candidate) => candidate.label === label);

    if (!group) {
      throw new Error(`CV "${cv.id}": no skill group "${label}".`);
    }

    return group;
  });
}

function pickProjects(cv: Cv, projects: Project[]): Project[] {
  return cv.projects.map((id) => {
    const project = projects.find((candidate) => candidate.id === id);

    if (!project) {
      throw new Error(`CV "${cv.id}": no project "${id}".`);
    }

    return project;
  });
}

/**
 * Resolves a CV's ids into the content it prints; throws on an unknown id.
 * The content lives in the database, so the caller passes it in.
 */
function printCv(cv: Cv, content: CvContent): PrintedCv {
  return {
    profile: content.profile,
    role: cv.role,
    summary: cv.summary,
    coreTechnologies: cv.coreTechnologies,
    experience: pickEntries(cv.id, content.experience, cv.experience),
    education: pickEntries(cv.id, content.education, cv.education),
    projects: pickProjects(cv, content.projects),
    skills: pickSkills(cv, content.skills),
    layout: cv.layout,
  };
}

export type { PrintedCv, PrintedEntry };
export { printCv };
