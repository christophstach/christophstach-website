CREATE TABLE "companies" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"key" text NOT NULL,
	"field" text DEFAULT '' NOT NULL,
	"headquarters" text DEFAULT '' NOT NULL,
	"funding" text DEFAULT '' NOT NULL,
	"website" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "companies_key_unique" UNIQUE("key")
);
