CREATE TABLE "cv_variant_entries" (
	"variant_id" text NOT NULL,
	"section" text NOT NULL,
	"position" integer NOT NULL,
	"entry_id" text NOT NULL,
	"bullets" text[] NOT NULL,
	CONSTRAINT "cv_variant_entries_variant_id_section_position_pk" PRIMARY KEY("variant_id","section","position")
);
--> statement-breakpoint
CREATE TABLE "cv_variants" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"role" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"skills" text[] DEFAULT '{}'::text[] NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cv_variant_entries" ADD CONSTRAINT "cv_variant_entries_variant_id_cv_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."cv_variants"("id") ON DELETE cascade ON UPDATE cascade;