-- Core technologies move from the profile to the variants: every variant starts with the profile's.
UPDATE "cv_variants" SET "core_technologies" = (SELECT "core_technologies" FROM "cv_profile" WHERE "id" = 1) WHERE EXISTS (SELECT 1 FROM "cv_profile" WHERE "id" = 1);
