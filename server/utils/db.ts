import {
  cvVariantEntries,
  cvVariantEntriesRelations,
  cvVariants,
  cvVariantsRelations,
} from "../db/schema";
import { drizzle } from "drizzle-orm/postgres-js";
import { env } from "std-env";
import postgres from "postgres";
import { useRuntimeConfig } from "nitropack/runtime";

const schema = { cvVariantEntries, cvVariantEntriesRelations, cvVariants, cvVariantsRelations };

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

let database: ReturnType<typeof connect> | false = false;

/**
 * The database, connected on first use. Vercel's Neon integration sets
 * DATABASE_URL; NUXT_DATABASE_URL overrides it.
 */
function useDb() {
  if (!database) {
    const url = useRuntimeConfig().databaseUrl || env.DATABASE_URL;

    if (!url) {
      throw new Error("No database configured: set DATABASE_URL (see .env.example).");
    }

    database = connect(url);
  }

  return database;
}

export { useDb };
