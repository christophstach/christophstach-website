// URLs of the site's non-page endpoints. Pages are linked through the
// router's typed `paths` (src/router.ts); these aren't routes it knows.

/** The public CV as a PDF, printed from /cv-print. */
export const CV_PDF_PATH = "/christoph-stach-cv.pdf";

/** GitHub sign-in for the desk (a server handler, not a page). */
export const GITHUB_SIGN_IN_PATH = "/auth/github";

/** Desk sign-in without GitHub, on the local dev server only (404 elsewhere). */
export const DEV_SIGN_IN_PATH = "/auth/dev";

/** What the home page shows of the CV (ISR-cached JSON). */
export const CV_HOME_API_PATH = "/api/cv-home";

/** What /curriculum shows of the website CV (ISR-cached JSON). */
export const CV_WEBSITE_API_PATH = "/api/cv-website";

/** The scheduled page check, called by Vercel Cron with CRON_SECRET. */
export const PAGE_CHECKS_API_PATH = "/api/desk/page-checks";

/** A private CV as a PDF, for the desk. */
export function deskCvPdfPath(id: string): string {
  return `/api/desk/cv/${encodeURIComponent(id)}`;
}

/** The CV an application sent, as a PDF of how it printed then. */
export function deskSentCvPdfPath(id: string): string {
  return `/api/desk/applications/${encodeURIComponent(id)}/sent-cv`;
}

/** A cover letter an application sent, as a PDF of how it printed then. */
export function deskSentLetterPdfPath(id: string, letter: string): string {
  return `/api/desk/applications/${encodeURIComponent(id)}/sent-letters/${encodeURIComponent(letter)}`;
}

/** A cover letter as a PDF, for the desk. */
export function deskLetterPdfPath(id: string): string {
  return `/api/desk/cover-letters/${encodeURIComponent(id)}/pdf`;
}
