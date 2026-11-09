import type { CvVariant } from "../data/cv-variants";

/** Just the content of a variant, without what the list adds (updatedAt, pageFills). */
function variantContent(variant: CvVariant): CvVariant {
  return {
    id: variant.id,
    label: variant.label,
    note: variant.note,
    role: variant.role,
    summary: variant.summary,
    coreTechnologies: [...variant.coreTechnologies],
    experience: variant.experience.map((pick) => ({ id: pick.id, bullets: [...pick.bullets] })),
    education: variant.education.map((pick) => ({ id: pick.id, bullets: [...pick.bullets] })),
    projects: [...variant.projects],
    skills: [...variant.skills],
    layout: { ...variant.layout },
  };
}

/** How many entries and bullets a variant prints, e.g. "4 entries · 11 bullets". */
function variantCounts(variant: CvVariant): string {
  const picks = [...variant.experience, ...variant.education];
  const bullets = picks.reduce((sum, pick) => sum + pick.bullets.length, 0);

  return `${picks.length} entries · ${bullets} bullets`;
}

export { variantContent, variantCounts };
