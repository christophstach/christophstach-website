import type { Bullet } from "~/data/cv";

/**
 * The bullets an output should show. Plain strings appear in both; the object
 * form is limited to one, so the PDF stays as lean as a recruiter expects while
 * the site keeps the full detail — without maintaining the text twice.
 */
export function bulletsFor(target: "web" | "print", bullets?: Bullet[]): string[] {
  return (bullets ?? [])
    .filter((bullet) => typeof bullet === "string" || bullet.only === target)
    .map((bullet) => (typeof bullet === "string" ? bullet : bullet.text));
}
