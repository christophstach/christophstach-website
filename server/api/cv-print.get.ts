import { defineEventHandler } from "h3";
import { printVariant } from "../../app/utils/cv-variant";
import { requireMarkedVariant } from "../utils/cv-variants";

// The public CV's content: the primary variant, which /cv-print prints for
// /christoph-stach-cv.pdf. Public because that PDF is.
export default defineEventHandler(async () =>
  printVariant(await requireMarkedVariant("isPrimary")),
);
