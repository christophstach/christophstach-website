import { listEntries, listSkillGroups } from "../../utils/cv-content";
import { defineEventHandler } from "h3";

// Everything variants pick from, as the desk edits it.
export default defineEventHandler(async (event) => {
  await requireUserSession(event);

  const [entries, skills] = await Promise.all([listEntries(), listSkillGroups()]);

  return { entries, skills };
});
