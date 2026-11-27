// Relative imports only: the server checks and stores layouts with this too.
import { Effect, Result, Schema } from "effect";

/**
 * How a CV's PDF uses its pages: fixed steps on the one design, so a
 * CV can fill its two pages without changing how the CV looks. "normal"
 * is the base layout of CvDocument.
 */
const CV_LAYOUT_STEPS = {
  /** Scales the vertical space between the header, sections, entries and bullets. */
  spacing: { compact: 0.85, normal: 1, airy: 1.2, spacious: 1.4 },
  /** Body text size in pt; every other size in the CV scales with it. */
  textSize: { small: 9.5, normal: 10, large: 10.5, larger: 11 },
  /** The @page margin on every side, in mm. */
  margin: { narrow: 18, normal: 24, wide: 30 },
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

const SpacingStepSchema = Schema.Literals(["compact", "normal", "airy", "spacious"]);
const TextSizeStepSchema = Schema.Literals(["small", "normal", "large", "larger"]);
const MarginStepSchema = Schema.Literals(["narrow", "normal", "wide"]);

/** A complete, valid layout. */
const CvLayoutSchema = Schema.Struct({
  spacing: SpacingStepSchema,
  textSize: TextSizeStepSchema,
  margin: MarginStepSchema,
});

function withNormalFallback<T extends string>(schema: Schema.Codec<T, T>, fallback: T) {
  return schema.pipe(
    Schema.catchDecoding(() => Effect.succeedSome(fallback)),
    Schema.withDecodingDefault(Effect.succeed(fallback)),
  );
}

/** Any stored value as a layout: unknown or missing steps become "normal". */
const StoredCvLayoutSchema = Schema.Struct({
  spacing: withNormalFallback(SpacingStepSchema, "normal"),
  textSize: withNormalFallback(TextSizeStepSchema, "normal"),
  margin: withNormalFallback(MarginStepSchema, "normal"),
});

const decodeCvLayout = Schema.decodeUnknownResult(CvLayoutSchema);
const decodeStoredCvLayout = Schema.decodeUnknownResult(StoredCvLayoutSchema);

function normalizeCvLayout(value: unknown): CvLayout {
  const result = decodeStoredCvLayout(value ?? {});

  return Result.isSuccess(result) ? result.success : DEFAULT_CV_LAYOUT;
}

/**
 * The steps in a query (?spacing=airy&margin=wide) over a stored layout, for
 * trying steps before saving them; unknown values keep the stored step.
 */
function layoutFromQuery(stored: CvLayout, query: Record<string, unknown>): CvLayout {
  return {
    spacing: isLayoutStep("spacing", query.spacing) ? query.spacing : stored.spacing,
    textSize: isLayoutStep("textSize", query.textSize) ? query.textSize : stored.textSize,
    margin: isLayoutStep("margin", query.margin) ? query.margin : stored.margin,
  };
}

/** The layout as query parameters, the reverse of layoutFromQuery. */
function layoutQuery(layout: CvLayout): Record<keyof CvLayout, string> {
  return { spacing: layout.spacing, textSize: layout.textSize, margin: layout.margin };
}

function sameLayout(one: CvLayout, other: CvLayout): boolean {
  return (
    one.spacing === other.spacing && one.textSize === other.textSize && one.margin === other.margin
  );
}

export type { CvLayout };
export {
  CV_LAYOUT_STEPS,
  CvLayoutSchema,
  DEFAULT_CV_LAYOUT,
  StoredCvLayoutSchema,
  decodeCvLayout,
  isLayoutStep,
  layoutFromQuery,
  layoutQuery,
  normalizeCvLayout,
  sameLayout,
};
