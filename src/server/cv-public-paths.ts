import "server-only";
import { CV_HOME_API_PATH, CV_PDF_PATH, CV_WEBSITE_API_PATH } from "../data/endpoints";

/** Cached public files that show the primary CV. */
const PRIMARY_PATHS = [CV_PDF_PATH];

/**
 * Cached public data that shows the website CV. The pages that read it
 * (/ and /curriculum) render per request, so only their data is cached.
 */
const WEBSITE_PATHS = [CV_WEBSITE_API_PATH];

/** The cached paths to renew after a write that touched these roles. */
function publicPaths({ primary, website }: { primary: boolean; website: boolean }) {
  return [...(primary ? PRIMARY_PATHS : []), ...(website ? WEBSITE_PATHS : [])];
}

/** Every cached public file and data: CV content changes can reach all of them. */
function allPublicPaths() {
  return [CV_HOME_API_PATH, ...PRIMARY_PATHS, ...WEBSITE_PATHS];
}

export { allPublicPaths, publicPaths };
