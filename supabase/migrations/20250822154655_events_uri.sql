alter table "public"."sessions" drop column "events";

alter table "public"."sessions" add column "event_uri" text;


