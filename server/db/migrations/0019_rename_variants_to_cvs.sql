-- CV variants are now called CVs: tables, columns and constraints renamed, no data changed.
ALTER TABLE "cv_variants" RENAME TO "cvs";--> statement-breakpoint
ALTER TABLE "cvs" RENAME CONSTRAINT "cv_variants_pkey" TO "cvs_pkey";--> statement-breakpoint
ALTER TABLE "cv_variant_entries" RENAME TO "cv_entry_picks";--> statement-breakpoint
ALTER TABLE "cv_entry_picks" RENAME COLUMN "variant_id" TO "cv_id";--> statement-breakpoint
ALTER TABLE "cv_entry_picks" RENAME CONSTRAINT "cv_variant_entries_variant_id_section_position_pk" TO "cv_entry_picks_cv_id_section_position_pk";--> statement-breakpoint
ALTER TABLE "cv_entry_picks" RENAME CONSTRAINT "cv_variant_entries_variant_id_cv_variants_id_fk" TO "cv_entry_picks_cv_id_cvs_id_fk";--> statement-breakpoint
ALTER TABLE "cover_letters" RENAME COLUMN "variant_id" TO "cv_id";--> statement-breakpoint
ALTER TABLE "cover_letters" RENAME CONSTRAINT "cover_letters_variant_id_cv_variants_id_fk" TO "cover_letters_cv_id_cvs_id_fk";
