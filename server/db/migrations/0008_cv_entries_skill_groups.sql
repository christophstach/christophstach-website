CREATE TABLE "cv_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"section" text NOT NULL,
	"title" text NOT NULL,
	"organization" text NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"from" text NOT NULL,
	"to" text DEFAULT '' NOT NULL,
	"tech" text[] DEFAULT '{}'::text[] NOT NULL,
	"bullets" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skill_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"items" text[] DEFAULT '{}'::text[] NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
