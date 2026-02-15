alter table "public"."sessions" drop column "synthesis";

alter table "public"."sessions" drop column "tags";

alter table "public"."sessions" drop column "tldr";

alter table "public"."sessions" add column "events" jsonb[];

alter table "public"."sessions" add column "external_group_id" text;

alter table "public"."sessions" add column "external_group_name" text;

alter table "public"."sessions" add column "external_user_id" text;

alter table "public"."sessions" add column "external_user_name" text;

alter table "public"."sessions" add column "features" text[];

alter table "public"."sessions" add column "story" text;


