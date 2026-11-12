ALTER TABLE "job_postings" ADD COLUMN "workplace" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "job_postings" ADD COLUMN "salary_min" integer;--> statement-breakpoint
ALTER TABLE "job_postings" ADD COLUMN "salary_max" integer;--> statement-breakpoint
ALTER TABLE "job_postings" ADD COLUMN "salary_currency" text DEFAULT '' NOT NULL;