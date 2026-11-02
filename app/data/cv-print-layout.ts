// Relative imports only: the server checks and stores layouts with this too.

/**
 * How a variant's PDF uses its pages: fixed steps on the one design, so a
 * variant can fill its two pages without changing how the CV looks. "normal"
 * is the base layout of CvDocument.
 */
const CV_LAYOUT_STEPS = {
  /** Scales the vertical space between the header, sections, entries and bullets. */
  spacing: { compact: 0.8, normal: 1, airy: 1.25, spacious: 1.5 },
  /** Body text size in px; every other size in the CV scales with it. */
  textSize: { small: 12.5, normal: 13, large: 13.5, larger: 14 },
  /** The @page margin on every side, in mm. */
  margin: { narrow: 14, normal: 18, wide: 22 },
} as const;

type CvLayoutSteps = typeof CV_LAYOUT_STEPS;
type CvLayout = { [Key in keyof CvLayoutSteps]: keyof CvLayoutSteps[Key] };

const DEFAULT_CV_LAYOUT: CvLayout = { spacing: "normal", textSize: "normal", margin: "normal" };

function isLayoutStep<Key extends keyof CvLayoutSteps>(
  key: Key,
  value: unknown,
): value is CvLayout[Key] {
  return typeof value === "string" && Object.hasOwn(CV_LAYOUT_STEPS[key], value);
}

/** A stored or sent layout with every unknown or missing step back to normal. */
function normalizeCvLayout(value: unknown): CvLayout {
  const layout = (value ?? {}) as Record<string, unknown>;

  return {
    spacing: isLayoutStep("spacing", layout.spacing) ? layout.spacing : "normal",
    textSize: isLayoutStep("textSize", layout.textSize) ? layout.textSize : "normal",
    margin: isLayoutStep("margin", layout.margin) ? layout.margin : "normal",
  };
}

export type { CvLayout };
export { CV_LAYOUT_STEPS, DEFAULT_CV_LAYOUT, isLayoutStep, normalizeCvLayout };
