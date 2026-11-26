import "server-only";
import { Context, Effect, Layer } from "effect";
import { type DatabaseClient, type DatabaseTransaction, tryUseDb } from "../db";
import { ConfigError, DatabaseError } from "./errors";

export interface DatabaseService {
  readonly client: Effect.Effect<DatabaseClient, ConfigError>;
  readonly query: <A>(
    fn: (db: DatabaseClient) => Promise<A>,
    message?: string,
  ) => Effect.Effect<A, DatabaseError | ConfigError>;
  readonly transaction: <A>(
    fn: (tx: DatabaseTransaction) => Promise<A>,
    message?: string,
  ) => Effect.Effect<A, DatabaseError | ConfigError>;
}

export class Database extends Context.Service<Database, DatabaseService>()("app/Database") {}

const getClient: Effect.Effect<DatabaseClient, ConfigError> = Effect.sync(() => tryUseDb()).pipe(
  Effect.filterOrFail(
    (client): client is DatabaseClient => client !== undefined,
    () =>
      new ConfigError({
        message: "No database configured: set DATABASE_URL (see .env.example).",
      }),
  ),
);

export const DatabaseLive: Layer.Layer<Database> = Layer.succeed(Database, {
  client: getClient,
  query: (fn, message = "Database query failed.") =>
    Effect.flatMap(getClient, (db) =>
      Effect.tryPromise({
        try: () => fn(db),
        catch: (cause) => new DatabaseError({ message, cause }),
      }),
    ),
  transaction: (fn, message = "Database transaction failed.") =>
    Effect.flatMap(getClient, (db) =>
      Effect.tryPromise({
        try: () => db.transaction(fn),
        catch: (cause) => new DatabaseError({ message, cause }),
      }),
    ),
});

/** Executes a Drizzle query against the `Database` service. */
export function dbQuery<A>(
  fn: (db: DatabaseClient) => Promise<A>,
  message = "Database query failed.",
): Effect.Effect<A, DatabaseError | ConfigError, Database> {
  return Effect.flatMap(Database, (database) => database.query(fn, message));
}

/** Executes a Drizzle transaction against the `Database` service. */
export function dbTransaction<A>(
  fn: (tx: DatabaseTransaction) => Promise<A>,
  message = "Database transaction failed.",
): Effect.Effect<A, DatabaseError | ConfigError, Database> {
  return Effect.flatMap(Database, (database) => database.transaction(fn, message));
}

function readProperty(value: unknown, key: string): unknown {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  return Reflect.get(value, key);
}

/**
 * Checks whether an error (or any wrapped `.cause`, e.g. `DatabaseError` ->
 * Drizzle error -> postgres-js error) carries the given PostgreSQL SQLSTATE
 * code such as `"23505"` (unique_violation).
 */
export function isPgErrorCode(error: unknown, code: string): boolean {
  let current: unknown = error;

  for (let depth = 0; depth < 5 && current !== undefined && current !== null; depth += 1) {
    if (readProperty(current, "code") === code) {
      return true;
    }

    current = readProperty(current, "cause");
  }

  return false;
}
