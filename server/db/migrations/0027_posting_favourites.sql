-- "Interesting" postings become favourites: postings parked to apply to later.
UPDATE "job_postings" SET "status" = 'favourite' WHERE "status" = 'interesting';
