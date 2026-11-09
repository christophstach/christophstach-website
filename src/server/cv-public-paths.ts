import "server-only";

/** Cached public files that show the primary variant. */
const PRIMARY_PATHS = ["/christoph-stach-cv.pdf"];

/**
 * Cached public data that shows the website variant. The pages that read it
 * (/ and /curriculum) render per request, so only their data is cached.
 */
const WEBSITE_PATHS = ["/api/cv-website"];

/** The cached paths to renew after a write that touched these roles. */
function publicPaths({ primary, website }: { primary: boolean; website: boolean }) {
  return [...(primary ? PRIMARY_PATHS : []), ...(website ? WEBSITE_PATHS : [])];
}

/** Every cached public file and data: CV content changes can reach all of them. */
function allPublicPaths() {
  return ["/api/cv-home", ...PRIMARY_PATHS, ...WEBSITE_PATHS];
}

export { allPublicPaths, publicPaths };
