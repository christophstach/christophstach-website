-- The projects that lived in app/data/cv.ts before they moved to the
-- database, and the website variant picking all of them in their old order.
INSERT INTO "projects" ("id", "title", "description", "tech", "created_at") VALUES
	('tiger', 'TIGeR (Toolkit for Integration of Generative AI Resources)', 'The common runtime multiple Mercedes-Benz agent teams build their LLM agents on, with Agent-to-Agent and Model Context Protocol interoperability.', '{Python,FastAPI,LLMs,A2A,MCP,Kubernetes,"GitLab CI"}', now() - interval '3 seconds'),
	('sdp', 'SDP (Speech Development Platform)', 'No-code platform for configuring and deploying speech applications for Mercedes-Benz.', '{Vue,Nuxt,Tailwind,NestJS,PostgreSQL,MongoDB,Websockets}', now() - interval '2 seconds'),
	('crowds-ui', 'Crowds UI', 'Workflow editor with graph-based task views and dynamic form generation to streamline internal processes.', '{React,Remix,Tailwind}', now() - interval '1 second')
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
UPDATE "cv_variants" SET "projects" = '{tiger,sdp,crowds-ui}' WHERE "is_website" AND "projects" = '{}';
