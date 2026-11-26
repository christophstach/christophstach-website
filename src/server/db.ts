import "server-only";
import {
  cvEntries,
  cvEntryPicks,
  cvEntryPicksRelations,
  cvs,
  cvsRelations,
  projects,
  skillGroups,
} from "../../server/db/schema";
import { drizzle } from "drizzle-orm/postgres-js";
import { env } from "virtual:solid-env/server";
import postgres from "postgres";

const schema = {
  cvEntries,
  cvEntryPicks,
  cvEntryPicksRelations,
  cvs,
  cvsRelations,
  projects,
  skillGroups,
};

function connect(url: string) {
  // Neon's URLs carry channel_binding=require, which postgres-js doesn't know
  // and would send to the server as a setting, failing the connection.
  const connection = new URL(url);

  connection.searchParams.delete("channel_binding");

  // prepare: false because Neon's pooled URL runs PgBouncer in transaction
  // mode, which can't keep prepared statements; one connection per function
  // instance is plenty for the desk.
  const client = postgres(connection.href, { max: 1, prepare: false });

  return drizzle(client, { schema, casing: "snake_case" });
}

type DatabaseClient = ReturnType<typeof connect>;
type DatabaseTransaction = Parameters<Parameters<DatabaseClient["transaction"]>[0]>[0];

let database: DatabaseClient | undefined;

/** Connects lazily if DATABASE_URL is configured; returns undefined otherwise. */
function tryUseDb(): DatabaseClient | undefined {
  if (database === undefined) {
    const url = env.DATABASE_URL;

    if (url === undefined || url === "") {
      return undefined;
    }

    database = connect(url);
  }

  return database;
}

/** The database, connected on first use. Vercel's Neon integration sets DATABASE_URL. */
function useDb(): DatabaseClient {
  const client = tryUseDb();

  if (client === undefined) {
    throw new Error("No database configured: set DATABASE_URL (see .env.example).");
  }

  return client;
}

export { tryUseDb, useDb };
export type { DatabaseClient, DatabaseTransaction };
