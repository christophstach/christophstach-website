ALTER TABLE "cv_entries" ADD CONSTRAINT "cv_entries_id_section_unique" UNIQUE("id","section");--> statement-breakpoint
ALTER TABLE "cv_entry_picks" ADD CONSTRAINT "cv_entry_picks_entry_fk" FOREIGN KEY ("entry_id","section") REFERENCES "public"."cv_entries"("id","section") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "cvs_one_primary" ON "cvs" USING btree ("is_primary") WHERE "cvs"."is_primary";--> statement-breakpoint
CREATE UNIQUE INDEX "cvs_one_website" ON "cvs" USING btree ("is_website") WHERE "cvs"."is_website";--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_id_check" CHECK ("applications"."id" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_company_check" CHECK (btrim("applications"."company") <> '');--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_workplace_check" CHECK ("applications"."workplace" in ('', 'remote', 'hybrid', 'onsite'));--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_salary_range_check" CHECK (("applications"."salary_min" is null or "applications"."salary_min" between 0 and 100000000)
        and ("applications"."salary_max" is null or "applications"."salary_max" between 0 and 100000000)
        and ("applications"."salary_min" is null or "applications"."salary_max" is null or "applications"."salary_min" <= "applications"."salary_max"));--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_salary_currency_check" CHECK ("applications"."salary_currency" in ('', 'EUR', 'USD', 'GBP', 'CHF'));--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_source_check" CHECK ("applications"."source" in ('portal', 'linkedin', 'recruiter', 'referral', 'direct', 'other'));--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_status_check" CHECK ("applications"."status" in ('preparing', 'applied'));--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_applied_on_check" CHECK ("applications"."applied_on" = '' or "applications"."applied_on" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$');--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_next_step_on_check" CHECK ("applications"."next_step_on" = '' or "applications"."next_step_on" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$');--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_contacts_check" CHECK (jsonb_typeof("applications"."contacts") = 'array');--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_events_check" CHECK (jsonb_typeof("applications"."events") = 'array');--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_sent_check" CHECK ("applications"."sent" is null or jsonb_typeof("applications"."sent") = 'object');--> statement-breakpoint
ALTER TABLE "collectors" ADD CONSTRAINT "collectors_id_check" CHECK ("collectors"."id" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');--> statement-breakpoint
ALTER TABLE "collectors" ADD CONSTRAINT "collectors_type_check" CHECK ("collectors"."type" in ('linkedin-email', 'ats-board'));--> statement-breakpoint
ALTER TABLE "collectors" ADD CONSTRAINT "collectors_label_check" CHECK (btrim("collectors"."label") <> '');--> statement-breakpoint
ALTER TABLE "collectors" ADD CONSTRAINT "collectors_secret_hash_check" CHECK ("collectors"."secret_hash" is null or "collectors"."secret_hash" ~ '^[0-9a-f]{64}$');--> statement-breakpoint
ALTER TABLE "collectors" ADD CONSTRAINT "collectors_board_check" CHECK (("collectors"."type" = 'ats-board') = ("collectors"."board" is not null)
        and ("collectors"."board" is null or jsonb_typeof("collectors"."board") = 'object'));--> statement-breakpoint
ALTER TABLE "collectors" ADD CONSTRAINT "collectors_counts_check" CHECK ("collectors"."last_found" >= 0 and "collectors"."last_added" >= 0);--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_id_check" CHECK ("companies"."id" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_name_check" CHECK (btrim("companies"."name") <> '');--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_key_check" CHECK (btrim("companies"."key") <> '');--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_field_check" CHECK ("companies"."field" in ('', 'ai', 'devtools', 'data', 'security', 'fintech', 'health', 'commerce', 'mobility', 'enterprise', 'consumer', 'agency', 'other'));--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_headquarters_check" CHECK ("companies"."headquarters" = '' or "companies"."headquarters" ~ '^[A-Z]{2}$');--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_funding_check" CHECK ("companies"."funding" in ('', 'vc', 'public', 'private', 'subsidiary'));--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_website_check" CHECK ("companies"."website" = '' or "companies"."website" ~ '^https?://.');--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_batch_check" CHECK ("companies"."batch" = '' or "companies"."batch" ~ '^[A-Z][0-9]{2}$');--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_sources_check" CHECK (jsonb_typeof("companies"."sources") = 'array');--> statement-breakpoint
ALTER TABLE "cover_letters" ADD CONSTRAINT "cover_letters_id_check" CHECK ("cover_letters"."id" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');--> statement-breakpoint
ALTER TABLE "cover_letters" ADD CONSTRAINT "cover_letters_label_check" CHECK (btrim("cover_letters"."label") <> '');--> statement-breakpoint
ALTER TABLE "cover_letters" ADD CONSTRAINT "cover_letters_language_check" CHECK ("cover_letters"."language" in ('en', 'de'));--> statement-breakpoint
ALTER TABLE "cover_letters" ADD CONSTRAINT "cover_letters_letter_date_check" CHECK ("cover_letters"."letter_date" = '' or "cover_letters"."letter_date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$');--> statement-breakpoint
ALTER TABLE "cv_entries" ADD CONSTRAINT "cv_entries_id_check" CHECK ("cv_entries"."id" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');--> statement-breakpoint
ALTER TABLE "cv_entries" ADD CONSTRAINT "cv_entries_section_check" CHECK ("cv_entries"."section" in ('experience', 'education'));--> statement-breakpoint
ALTER TABLE "cv_entries" ADD CONSTRAINT "cv_entries_title_check" CHECK (btrim("cv_entries"."title") <> '');--> statement-breakpoint
ALTER TABLE "cv_entries" ADD CONSTRAINT "cv_entries_organization_check" CHECK (btrim("cv_entries"."organization") <> '');--> statement-breakpoint
ALTER TABLE "cv_entries" ADD CONSTRAINT "cv_entries_from_check" CHECK ("cv_entries"."from" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');--> statement-breakpoint
ALTER TABLE "cv_entries" ADD CONSTRAINT "cv_entries_to_check" CHECK ("cv_entries"."to" = '' or "cv_entries"."to" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');--> statement-breakpoint
ALTER TABLE "cv_entries" ADD CONSTRAINT "cv_entries_dates_check" CHECK ("cv_entries"."to" = '' or "cv_entries"."to" >= "cv_entries"."from");--> statement-breakpoint
ALTER TABLE "cv_entries" ADD CONSTRAINT "cv_entries_bullets_check" CHECK (jsonb_typeof("cv_entries"."bullets") = 'array');--> statement-breakpoint
ALTER TABLE "cv_entries" ADD CONSTRAINT "cv_entries_links_check" CHECK (jsonb_typeof("cv_entries"."links") = 'array');--> statement-breakpoint
ALTER TABLE "cv_entry_picks" ADD CONSTRAINT "cv_entry_picks_section_check" CHECK ("cv_entry_picks"."section" in ('experience', 'education'));--> statement-breakpoint
ALTER TABLE "cv_entry_picks" ADD CONSTRAINT "cv_entry_picks_position_check" CHECK ("cv_entry_picks"."position" >= 0);--> statement-breakpoint
ALTER TABLE "cv_profile" ADD CONSTRAINT "cv_profile_single_row_check" CHECK ("cv_profile"."id" = 1);--> statement-breakpoint
ALTER TABLE "cv_profile" ADD CONSTRAINT "cv_profile_name_check" CHECK (btrim("cv_profile"."name") <> '');--> statement-breakpoint
ALTER TABLE "cv_profile" ADD CONSTRAINT "cv_profile_links_check" CHECK (jsonb_typeof("cv_profile"."links") = 'array');--> statement-breakpoint
ALTER TABLE "cvs" ADD CONSTRAINT "cvs_id_check" CHECK ("cvs"."id" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');--> statement-breakpoint
ALTER TABLE "cvs" ADD CONSTRAINT "cvs_label_check" CHECK (btrim("cvs"."label") <> '');--> statement-breakpoint
ALTER TABLE "cvs" ADD CONSTRAINT "cvs_layout_check" CHECK (jsonb_typeof("cvs"."layout") = 'object');--> statement-breakpoint
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_id_check" CHECK ("job_postings"."id" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');--> statement-breakpoint
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_source_check" CHECK ("job_postings"."source" in ('linkedin', 'web', 'greenhouse', 'lever', 'ashby', 'personio'));--> statement-breakpoint
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_external_id_check" CHECK (btrim("job_postings"."external_id") <> '');--> statement-breakpoint
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_url_check" CHECK ("job_postings"."url" ~ '^https?://.');--> statement-breakpoint
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_posted_on_check" CHECK ("job_postings"."posted_on" = '' or "job_postings"."posted_on" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$');--> statement-breakpoint
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_workplace_check" CHECK ("job_postings"."workplace" in ('', 'remote', 'hybrid', 'onsite'));--> statement-breakpoint
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_salary_range_check" CHECK (("job_postings"."salary_min" is null or "job_postings"."salary_min" between 0 and 100000000)
        and ("job_postings"."salary_max" is null or "job_postings"."salary_max" between 0 and 100000000)
        and ("job_postings"."salary_min" is null or "job_postings"."salary_max" is null or "job_postings"."salary_min" <= "job_postings"."salary_max"));--> statement-breakpoint
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_salary_currency_check" CHECK ("job_postings"."salary_currency" in ('', 'EUR', 'USD', 'GBP', 'CHF'));--> statement-breakpoint
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_status_check" CHECK ("job_postings"."status" in ('new', 'favourite', 'dismissed'));--> statement-breakpoint
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_score_check" CHECK (("job_postings"."score" is null and "job_postings"."scored_at" is null)
        or ("job_postings"."score" between 0 and 100 and "job_postings"."scored_at" is not null));--> statement-breakpoint
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_score_reasons_check" CHECK (jsonb_typeof("job_postings"."score_reasons") = 'array');--> statement-breakpoint
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_score_concerns_check" CHECK (jsonb_typeof("job_postings"."score_concerns") = 'array');--> statement-breakpoint
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_ad_text_url_check" CHECK ("job_postings"."ad_text_url" = '' or "job_postings"."ad_text_url" ~ '^https?://.');--> statement-breakpoint
ALTER TABLE "job_postings" ADD CONSTRAINT "job_postings_ad_text_check" CHECK ("job_postings"."ad_text_url" = '' or "job_postings"."ad_text_checked_at" is not null);--> statement-breakpoint
ALTER TABLE "job_search" ADD CONSTRAINT "job_search_single_row_check" CHECK ("job_search"."id" = 1);--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_id_check" CHECK ("projects"."id" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_title_check" CHECK (btrim("projects"."title") <> '');--> statement-breakpoint
ALTER TABLE "skill_groups" ADD CONSTRAINT "skill_groups_id_check" CHECK ("skill_groups"."id" ~ '^[a-z0-9][a-z0-9_-]*$');--> statement-breakpoint
ALTER TABLE "skill_groups" ADD CONSTRAINT "skill_groups_title_check" CHECK (btrim("skill_groups"."title") <> '');--> statement-breakpoint
ALTER TABLE "skill_groups" ADD CONSTRAINT "skill_groups_position_check" CHECK ("skill_groups"."position" >= 0);