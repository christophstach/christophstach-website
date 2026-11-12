ALTER TABLE "collectors" ALTER COLUMN "secret_hash" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "collectors" ADD COLUMN "board" jsonb;