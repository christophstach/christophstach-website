ALTER TABLE "applications" ALTER COLUMN "status" SET DEFAULT 'preparing';--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "workplace" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "salary_min" integer;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "salary_max" integer;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "salary_currency" text DEFAULT '' NOT NULL;--> statement-breakpoint
-- "Saved" applications become "preparing": parking a job is a favourite posting now.
UPDATE "applications" SET "status" = 'preparing' WHERE "status" = 'saved';--> statement-breakpoint
-- A posting counts as applied to by its linked application, no longer by its status.
UPDATE "job_postings" SET "status" = 'new' WHERE "status" = 'applied';
