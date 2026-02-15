create type "public"."source_status" as enum ('pending', 'syncing', 'synced');

alter table "public"."sources" add column "status" public.source_status not null default 'pending'::public.source_status;


