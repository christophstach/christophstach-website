export const SITE_URL = "https://christophstach.de";

export const SITE_OWNER = {
  name: "Christoph Stach",
  location: "Berlin, Germany",
  locationDe: "Berlin, Deutschland",
  streetAddress: "",
  postalCodeCity: "Berlin",
  githubUrl: "https://github.com/christophstach",
  linkedinUrl: "https://www.linkedin.com/in/christoph-stach-7586b958",
} as const;

// Stored as character codes so no literal email address ships in SSR HTML or client
// bundles. To switch to a custom domain alias later, replace this list with
// `[...newAddress].map((char) => char.charCodeAt(0))`.
const OWNER_EMAIL_CODES: readonly number[] = [
  99, 104, 114, 105, 115, 116, 111, 112, 104, 46, 115, 116, 97, 99, 104, 64, 103, 109, 97, 105, 108,
  46, 99, 111, 109,
];

/** Assembles the site owner's email address on demand in the browser. */
export function resolveOwnerEmail(): string {
  return String.fromCharCode(...OWNER_EMAIL_CODES);
}

/** Normalizes a URL pathname: ensures a leading "/" and strips trailing slashes except "/". */
export function normalizePathname(pathname: string): string {
  const trimmed = pathname.trim();
  const withLeading = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const withoutTrailing = withLeading.replace(/\/+$/, "");

  return withoutTrailing === "" ? "/" : withoutTrailing;
}
