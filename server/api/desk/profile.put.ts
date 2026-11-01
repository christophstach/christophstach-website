import { defineEventHandler, readBody } from "h3";
import { parseProfileBody } from "../../utils/cv-content-body";
import { publicPaths } from "../../utils/cv-public-paths";
import { revalidatePaths } from "../../utils/cv-pdf";
import { saveProfile } from "../../utils/cv-content";

// Saves the profile and renews the public PDF, the only public page showing it.
export default defineEventHandler(async (event) => {
  await requireUserSession(event);

  const profile = parseProfileBody(await readBody(event));

  await saveProfile(profile);
  await revalidatePaths(event, publicPaths({ primary: true, website: false }));

  return profile;
});
