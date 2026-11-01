/** Cached public pages that show the primary variant. */
const PRIMARY_PATHS = ["/christoph-stach-cv.pdf"];

/** Cached public pages and data that show the website variant. */
const WEBSITE_PATHS = ["/curriculum", "/api/cv-website"];

/** The cached paths to renew after a write that touched these roles. */
function publicPaths({ primary, website }: { primary: boolean; website: boolean }) {
  return [...(primary ? PRIMARY_PATHS : []), ...(website ? WEBSITE_PATHS : [])];
}

export { publicPaths };
