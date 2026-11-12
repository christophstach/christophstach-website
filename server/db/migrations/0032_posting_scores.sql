CREATE TABLE "job_search" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job_postings" ADD COLUMN "score" integer;--> statement-breakpoint
ALTER TABLE "job_postings" ADD COLUMN "score_reasons" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "job_postings" ADD COLUMN "score_concerns" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "job_postings" ADD COLUMN "score_cv_id" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "job_postings" ADD COLUMN "score_model" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "job_postings" ADD COLUMN "scored_at" timestamp with time zone;