import { defineEventHandler, readBody } from "h3";
import { allPublicPaths } from "../../utils/cv-public-paths";
import { parseSkillGroupsBody } from "../../utils/cv-content-body";
import { revalidatePaths } from "../../utils/cv-pdf";
import { saveSkillGroups } from "../../utils/cv-content";

// Replaces all skill groups (order included) and renews the public pages.
export default defineEventHandler(async (event) => {
  await requireUserSession(event);

  const groups = parseSkillGroupsBody(await readBody(event));

  await saveSkillGroups(groups);
  await revalidatePaths(event, allPublicPaths());

  return groups;
});
