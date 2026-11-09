// URLs of the site's non-page endpoints. Pages are linked through the
// router's typed `paths` (src/router.ts); these aren't routes it knows.

/** The public CV as a PDF, printed from /cv-print. */
export const CV_PDF_PATH = "/christoph-stach-cv.pdf";

/** GitHub sign-in for the desk (a server handler, not a page). */
export const GITHUB_SIGN_IN_PATH = "/auth/github";

/** What the home page shows of the CV (ISR-cached JSON). */
export const CV_HOME_API_PATH = "/api/cv-home";

/** What /curriculum shows of the website variant (ISR-cached JSON). */
export const CV_WEBSITE_API_PATH = "/api/cv-website";
