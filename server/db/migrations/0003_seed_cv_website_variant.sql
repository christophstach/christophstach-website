-- The variant /curriculum shows: every entry and bullet of cv.ts, in cv.ts
-- order, as the page showed them before it read the database.
INSERT INTO "cv_variants" ("id", "label", "role", "summary", "skills", "is_website") VALUES
	('website', 'Website', 'Senior Full-Stack Engineer', '', '{}', true)
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "cv_variant_entries" ("variant_id", "section", "position", "entry_id", "bullets") VALUES
	('website', 'experience', 0, 'mbition', '{sdp,agent-platform,async-memory,ci-gitlab,type-safety,monorepo,ai-dev,datatable,rbac}'),
	('website', 'experience', 1, 'dericon', '{workflow-builder,angular,integrations}'),
	('website', 'experience', 2, 'slh', '{php-modernization,stakeholders}'),
	('website', 'education', 0, 'msc', '{thesis,specialisations,grade,exchange}'),
	('website', 'education', 1, 'bsc', '{thesis,grade,exchange}'),
	('website', 'education', 2, 'apprenticeship', '{theory,grade}')
ON CONFLICT DO NOTHING;
