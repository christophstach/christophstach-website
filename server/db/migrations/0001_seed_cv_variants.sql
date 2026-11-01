-- The three variants that lived in app/data/cv-variants.ts before the CV
-- variants moved to the database. From here on they are edited in the desk.
-- created_at keeps their old order, which the desk lists them in.
INSERT INTO "cv_variants" ("id", "label", "role", "summary", "skills", "is_primary", "created_at") VALUES
	('general', 'General', 'Senior Full-Stack Engineer', 'Started with an IT apprenticeship and a full-time developer role, then earned a B.Sc. and an M.Sc. (1.1) in computer science while working alongside. Now building platforms at Mercedes-Benz.', '{}', true, now() - interval '3 seconds'),
	('frontend', 'Frontend', 'Senior Frontend Engineer', 'Started with an IT apprenticeship and a full-time developer role, then earned a B.Sc. and an M.Sc. (1.1) in computer science while working alongside. Now building platforms at Mercedes-Benz.', '{frontend,backend_api,infra_cicd}', false, now() - interval '2 seconds'),
	('ai-platform', 'AI & Platform', 'Senior Platform Engineer (AI)', 'Started with an IT apprenticeship and a full-time developer role, then earned a B.Sc. and an M.Sc. (1.1) in computer science while working alongside. Now building platforms at Mercedes-Benz.', '{ai_llm,backend_api,infra_cicd}', false, now() - interval '1 second')
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "cv_variant_entries" ("variant_id", "section", "position", "entry_id", "bullets") VALUES
	('general', 'experience', 0, 'mbition', '{sdp,agent-platform,async-memory,ci-gitlab,type-safety,monorepo,ai-dev}'),
	('general', 'experience', 1, 'dericon', '{workflow-builder,angular,integrations}'),
	('general', 'experience', 2, 'slh', '{php-modernization}'),
	('general', 'education', 0, 'msc', '{specialisations,grade,exchange}'),
	('general', 'education', 1, 'bsc', '{thesis,grade,exchange}'),
	('general', 'education', 2, 'apprenticeship', '{}'),
	('frontend', 'experience', 0, 'mbition', '{sdp,datatable,rbac,monorepo,type-safety,ai-dev}'),
	('frontend', 'experience', 1, 'dericon', '{workflow-builder,angular,integrations}'),
	('frontend', 'experience', 2, 'slh', '{php-modernization}'),
	('frontend', 'education', 0, 'msc', '{specialisations,grade,exchange}'),
	('frontend', 'education', 1, 'bsc', '{thesis,grade,exchange}'),
	('frontend', 'education', 2, 'apprenticeship', '{}'),
	('ai-platform', 'experience', 0, 'mbition', '{agent-platform,async-memory,ci-gitlab,type-safety,ai-dev,sdp}'),
	('ai-platform', 'experience', 1, 'dericon', '{workflow-builder,integrations}'),
	('ai-platform', 'experience', 2, 'slh', '{php-modernization}'),
	('ai-platform', 'education', 0, 'msc', '{specialisations,grade,exchange}'),
	('ai-platform', 'education', 1, 'bsc', '{thesis,grade,exchange}'),
	('ai-platform', 'education', 2, 'apprenticeship', '{}')
ON CONFLICT DO NOTHING;
