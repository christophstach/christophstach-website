import { Schema } from "effect";
import { number, object, string } from "zod/mini";

/** The GitHub account signed into the desk, as the session keeps it. */
const DeskUserSchema = Schema.Struct({
  githubId: Schema.Int,
  login: Schema.String,
  avatarUrl: Schema.String,
});

type DeskUser = typeof DeskUserSchema.Type;

const decodeDeskUser = Schema.decodeUnknownResult(DeskUserSchema);

// Temporary W2 compat until W3/W5 callers migrate
const deskUserSchema = object({ githubId: number(), login: string(), avatarUrl: string() });

export type { DeskUser };
export { DeskUserSchema, decodeDeskUser, deskUserSchema };
