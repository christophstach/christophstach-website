import { defineEventHandler } from "h3";
import { printVariant } from "../../app/utils/cv-variant";
import { requireMarkedVariant } from "../utils/cv-variants";

// The experience and education /curriculum shows: the website variant. Cached
// with ISR (see routeRules) and renewed when the desk changes it.
export default defineEventHandler(async () =>
  printVariant(await requireMarkedVariant("isWebsite")),
);
