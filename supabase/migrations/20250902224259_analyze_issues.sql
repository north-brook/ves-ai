alter table "public"."issues" add column "analysis_hash" text;

alter table "public"."issues" add column "analyzed_at" timestamp with time zone;


