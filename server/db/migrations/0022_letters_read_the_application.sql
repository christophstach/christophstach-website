ALTER TABLE "cover_letters" DROP CONSTRAINT "cover_letters_cv_id_cvs_id_fk";
--> statement-breakpoint
ALTER TABLE "cover_letters" ALTER COLUMN "application_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "cover_letters" DROP COLUMN "cv_id";--> statement-breakpoint
ALTER TABLE "cover_letters" DROP COLUMN "company";--> statement-breakpoint
ALTER TABLE "cover_letters" DROP COLUMN "job_title";--> statement-breakpoint
ALTER TABLE "cover_letters" DROP COLUMN "job_url";--> statement-breakpoint
ALTER TABLE "cover_letters" DROP COLUMN "job_description";