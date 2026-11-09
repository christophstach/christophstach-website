import { number, object, string } from "zod/mini";
import type { output } from "zod/mini";

/** The GitHub account signed into the desk, as the session keeps it. */
const deskUserSchema = object({ githubId: number(), login: string(), avatarUrl: string() });

type DeskUser = output<typeof deskUserSchema>;

export type { DeskUser };
export { deskUserSchema };
