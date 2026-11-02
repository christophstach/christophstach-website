-- Desk names start from what identifies each row today; the desk renames them.
UPDATE "cv_entries" SET "name" = CASE WHEN "section" = 'experience' THEN "organization" ELSE "title" END WHERE "name" = '';--> statement-breakpoint
UPDATE "skill_groups" SET "name" = "title" WHERE "name" = '';--> statement-breakpoint
UPDATE "projects" SET "name" = "title" WHERE "name" = '';
