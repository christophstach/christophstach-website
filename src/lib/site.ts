export const SITE_URL = "https://christophstach.de";

export const SITE_OWNER = {
  name: "Christoph Stach",
  location: "Berlin, Germany",
  locationDe: "Berlin, Deutschland",
  streetAddress: "",
  postalCodeCity: "Berlin",
  email: "christoph.stach@gmail.com",
  githubUrl: "https://github.com/christophstach",
  linkedinUrl: "https://www.linkedin.com/in/christoph-stach-7586b958",
} as const;

/** Normalizes a URL pathname: ensures a leading "/" and strips trailing slashes except "/". */
export function normalizePathname(pathname: string): string {
  const trimmed = pathname.trim();
  const withLeading = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const withoutTrailing = withLeading.replace(/\/+$/, "");

  return withoutTrailing === "" ? "/" : withoutTrailing;
}
