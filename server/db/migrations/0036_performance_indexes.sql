CREATE INDEX "applications_posting_id_idx" ON "applications" USING btree ("posting_id") WHERE "applications"."posting_id" is not null;--> statement-breakpoint
CREATE INDEX "applications_cv_id_idx" ON "applications" USING btree ("cv_id");--> statement-breakpoint
CREATE INDEX "cv_entry_picks_entry_section_idx" ON "cv_entry_picks" USING btree ("entry_id","section");--> statement-breakpoint
CREATE INDEX "job_postings_collector_id_idx" ON "job_postings" USING btree ("collector_id");--> statement-breakpoint
CREATE INDEX "job_postings_status_created_at_idx" ON "job_postings" USING btree ("status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "job_postings_scored_at_idx" ON "job_postings" USING btree ("scored_at");--> statement-breakpoint
CREATE INDEX "job_postings_ad_text_checked_at_idx" ON "job_postings" USING btree ("ad_text_checked_at");