import type { Cv } from "../data/cvs";

/** Just the content of a CV, without what the list adds (updatedAt, pageFills). */
function cvContent(cv: Cv): Cv {
  return {
    id: cv.id,
    label: cv.label,
    note: cv.note,
    role: cv.role,
    summary: cv.summary,
    coreTechnologies: [...cv.coreTechnologies],
    experience: cv.experience.map((pick) => ({ id: pick.id, bullets: [...pick.bullets] })),
    education: cv.education.map((pick) => ({ id: pick.id, bullets: [...pick.bullets] })),
    projects: [...cv.projects],
    skills: [...cv.skills],
    layout: { ...cv.layout },
  };
}

/** How many entries and bullets a CV prints, e.g. "4 entries · 11 bullets". */
function cvCounts(cv: Cv): string {
  const picks = [...cv.experience, ...cv.education];
  const bullets = picks.reduce((sum, pick) => sum + pick.bullets.length, 0);

  return `${picks.length} entries · ${bullets} bullets`;
}

export { cvContent, cvCounts };
