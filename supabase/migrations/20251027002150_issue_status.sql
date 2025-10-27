-- Drop the old status column
alter table "public"."issues" drop column "status";

-- Drop the old enum type
drop type if exists "public"."issue_status";

-- Create new enum types
create type "public"."issue_status" as enum ('pending', 'analyzing', 'analyzed', 'failed');

create type "public"."issue_external_status" as enum ('backlog', 'todo', 'in_progress', 'in_review', 'done', 'canceled', 'duplicate');

-- Add the new status column
alter table "public"."issues" add column "status" issue_status not null default 'pending'::issue_status;

-- Add the external_status column
alter table "public"."issues" add column "external_status" issue_external_status;
