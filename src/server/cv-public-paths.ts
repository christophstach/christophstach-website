import "server-only";
import { CV_HOME_API_PATH, CV_PDF_PATH, CV_WEBSITE_API_PATH } from "../data/endpoints";

/** Cached public home page and its summary data endpoint. */
const HOME_PATHS = ["/", CV_HOME_API_PATH];

/** Cached public files that show the primary CV. */
const PRIMARY_PATHS = [CV_PDF_PATH];

/** Cached public page and data that show the website CV. */
const WEBSITE_PATHS = ["/curriculum", CV_WEBSITE_API_PATH];

/** Dynamic sitemap reflecting public CV update timestamps. */
const SITEMAP_PATH = "/sitemap.xml";

/** The cached paths to renew after a write that touched these roles. */
function publicPaths({ primary, website }: { primary: boolean; website: boolean }) {
  const paths = [...(primary ? PRIMARY_PATHS : []), ...(website ? WEBSITE_PATHS : [])];

  return paths.length > 0 ? [...paths, SITEMAP_PATH] : [];
}

/** Every cached public page, file and data endpoint: CV content changes can reach all of them. */
function allPublicPaths() {
  return [...HOME_PATHS, ...WEBSITE_PATHS, ...PRIMARY_PATHS, SITEMAP_PATH];
}

export { allPublicPaths, publicPaths };
