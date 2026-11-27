import { Schema } from "effect";

/** The GitHub account signed into the desk, as the session keeps it. */
const DeskUserSchema = Schema.Struct({
  githubId: Schema.Int,
  login: Schema.String,
  avatarUrl: Schema.String,
});

type DeskUser = typeof DeskUserSchema.Type;

const decodeDeskUser = Schema.decodeUnknownResult(DeskUserSchema);

export type { DeskUser };
export { DeskUserSchema, decodeDeskUser };
