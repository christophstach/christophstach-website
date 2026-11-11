-- Every cover letter so far stood for one application: each gets its own, with the letter's
-- id, job and CV. A dated letter counts as sent on that date.
INSERT INTO "applications" ("id", "company", "job_title", "job_url", "job_description", "status", "cv_id", "applied_on", "note", "created_at", "updated_at")
SELECT "id", "company", "job_title", "job_url", "job_description",
	CASE WHEN "letter_date" <> '' THEN 'applied' ELSE 'saved' END,
	"cv_id", "letter_date", "note", "created_at", "updated_at"
FROM "cover_letters"
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint
UPDATE "cover_letters" SET "application_id" = "id" WHERE "application_id" IS NULL;
