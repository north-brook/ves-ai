alter table "public"."sessions" drop column "recording_id";

alter table "public"."sessions" add column "external_id" text not null;


