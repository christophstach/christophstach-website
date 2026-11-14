ALTER TABLE "job_postings" ADD COLUMN "ad_text_url" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "job_postings" ADD COLUMN "ad_text_checked_at" timestamp with time zone;