import { defineConfig } from "drizzle-kit";

// Migrations run against the direct (unpooled) connection when there is one:
// Neon's pooled URL goes through PgBouncer, which migrations should avoid.
export default defineConfig({
  dialect: "postgresql",
  schema: "./server/db/schema.ts",
  out: "./server/db/migrations",
  casing: "snake_case",
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "",
  },
});
