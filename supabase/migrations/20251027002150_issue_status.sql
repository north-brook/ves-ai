create type "public"."issue_external_status" as enum ('backlog', 'todo', 'in_progress', 'in_review', 'done', 'canceled', 'duplicate');

alter table "public"."issues" alter column "status" drop default;

alter type "public"."issue_status" rename to "issue_status__old_version_to_be_dropped";

create type "public"."issue_status" as enum ('pending', 'analyzing', 'analyzed', 'failed');

alter table "public"."issues" alter column status type "public"."issue_status" using status::text::"public"."issue_status";

alter table "public"."issues" alter column "status" set default None;

drop type "public"."issue_status__old_version_to_be_dropped";

alter table "public"."issues" add column "external_status" issue_external_status;

alter table "public"."issues" alter column "status" set default 'pending'::issue_status;

alter table "public"."issues" alter column "status" set not null;


