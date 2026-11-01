import { printStoredVariant, requireMarkedVariant } from "../utils/cv-variants";
import { defineEventHandler } from "h3";

// The public CV's content: the primary variant, which /cv-print prints for
// /christoph-stach-cv.pdf. Public because that PDF is.
export default defineEventHandler(async () =>
  printStoredVariant(await requireMarkedVariant("isPrimary")),
);
