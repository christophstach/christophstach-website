import { printStoredVariant, requireMarkedVariant } from "../utils/cv-variants";
import { defineEventHandler } from "h3";

// What /curriculum shows: the website variant's experience, education and
// projects. Cached with ISR (see routeRules) and renewed when the desk
// changes the variant or a project.
export default defineEventHandler(async () =>
  printStoredVariant(await requireMarkedVariant("isWebsite")),
);
