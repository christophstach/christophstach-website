CREATE TABLE "cover_letters" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"variant_id" text,
	"company" text NOT NULL,
	"recipient" text DEFAULT '' NOT NULL,
	"job_title" text DEFAULT '' NOT NULL,
	"job_url" text DEFAULT '' NOT NULL,
	"job_description" text DEFAULT '' NOT NULL,
	"language" text DEFAULT 'en' NOT NULL,
	"letter_date" text DEFAULT '' NOT NULL,
	"subject" text DEFAULT '' NOT NULL,
	"salutation" text DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"closing" text DEFAULT '' NOT NULL,
	"page_fills" real[] DEFAULT '{}'::real[] NOT NULL,
	"page_fills_build" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cover_letters" ADD CONSTRAINT "cover_letters_variant_id_cv_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."cv_variants"("id") ON DELETE set null ON UPDATE cascade;