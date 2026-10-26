import { cvVariants, primaryVariantId } from "~/data/cv-variants";
import { education, experience, skills } from "~/data/cv";

type CvVariant = (typeof cvVariants)[number];
type EntryPick = CvVariant["experience"][number];
type SkillGroup = (typeof skills)[number];
type TimelineEntry = (typeof experience)[number];

/** A timeline entry as a variant prints it: its picked bullets, in order. */
type PrintedEntry = Omit<TimelineEntry, "bullets"> & { bullets: string[] };

/** Everything CvDocument renders for one variant. */
interface PrintedCv {
  role: string;
  summary?: string;
  experience: PrintedEntry[];
  education: PrintedEntry[];
  skills: SkillGroup[];
}

function pickEntries(variantId: string, entries: TimelineEntry[], picks: EntryPick[]) {
  return picks.map((pick): PrintedEntry => {
    const entry = entries.find((candidate) => candidate.id === pick.id);

    if (!entry) {
      throw new Error(`CV variant "${variantId}": no entry "${pick.id}".`);
    }

    const bullets = pick.bullets.map((bulletId) => {
      const text = entry.bullets?.[bulletId];

      if (text === undefined) {
        throw new Error(
          `CV variant "${variantId}": entry "${pick.id}" has no bullet "${bulletId}".`,
        );
      }

      return text;
    });

    return { ...entry, bullets };
  });
}

function pickSkills(variant: CvVariant): SkillGroup[] {
  return (variant.skills ?? []).map((label) => {
    const group = skills.find((candidate) => candidate.label === label);

    if (!group) {
      throw new Error(`CV variant "${variant.id}": no skill group "${label}".`);
    }

    return group;
  });
}

function findVariant(id: string): CvVariant | undefined {
  return cvVariants.find((variant) => variant.id === id);
}

const primaryVariant = findVariant(primaryVariantId)!;

/** Resolves a variant's ids into the content it prints; throws on an unknown id. */
function printVariant(variant: CvVariant): PrintedCv {
  return {
    role: variant.role,
    summary: variant.summary,
    experience: pickEntries(variant.id, experience, variant.experience),
    education: pickEntries(variant.id, education, variant.education),
    skills: pickSkills(variant),
  };
}

export type { PrintedCv, PrintedEntry };
export { findVariant, primaryVariant, printVariant };
