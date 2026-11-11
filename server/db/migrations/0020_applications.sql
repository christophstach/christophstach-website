CREATE TABLE "applications" (
	"id" text PRIMARY KEY NOT NULL,
	"company" text NOT NULL,
	"job_title" text DEFAULT '' NOT NULL,
	"job_url" text DEFAULT '' NOT NULL,
	"job_description" text DEFAULT '' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"source" text DEFAULT 'other' NOT NULL,
	"status" text DEFAULT 'saved' NOT NULL,
	"cv_id" text,
	"applied_on" text DEFAULT '' NOT NULL,
	"next_step" text DEFAULT '' NOT NULL,
	"next_step_on" text DEFAULT '' NOT NULL,
	"contacts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"events" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cover_letters" ADD COLUMN "application_id" text;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_cv_id_cvs_id_fk" FOREIGN KEY ("cv_id") REFERENCES "public"."cvs"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "cover_letters" ADD CONSTRAINT "cover_letters_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE cascade;