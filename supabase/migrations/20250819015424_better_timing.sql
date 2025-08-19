alter table "public"."sessions" add column "processed_at" timestamp with time zone;

alter table "public"."sessions" add column "tldr" text;

