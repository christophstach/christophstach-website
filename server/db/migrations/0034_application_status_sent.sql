-- The status says only whether an application went out: everything past
-- "preparing" (interviewing, offer, accepted, rejected, withdrawn) was sent.
UPDATE "applications" SET "status" = 'applied' WHERE "status" NOT IN ('preparing', 'applied');
