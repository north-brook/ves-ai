alter table "public"."project_groups" drop column "last_analyzed_at";

alter table "public"."project_groups" add column "analyzed_at" timestamp with time zone;

alter table "public"."project_users" drop column "last_analyzed_at";

alter table "public"."project_users" add column "analyzed_at" timestamp with time zone;


