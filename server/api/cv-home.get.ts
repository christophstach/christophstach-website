import { defineEventHandler } from "h3";
import { loadCvContent } from "../utils/cv-content";

// What the home page shows of the CV: how long each job ran (for the years of
// experience) and every skill group. Cached with ISR, renewed by the desk.
export default defineEventHandler(async () => {
  const { experience, skills } = await loadCvContent();

  return {
    experience: experience.map((entry) => ({ from: entry.from, to: entry.to })),
    skills,
  };
});
