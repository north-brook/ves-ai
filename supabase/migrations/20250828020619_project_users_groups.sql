drop policy "Users can link sessions to tickets" on "public"."session_tickets";

drop policy "Users can manage project tickets" on "public"."tickets";

revoke delete on table "public"."session_tickets" from "anon";

revoke insert on table "public"."session_tickets" from "anon";

revoke references on table "public"."session_tickets" from "anon";

revoke select on table "public"."session_tickets" from "anon";

revoke trigger on table "public"."session_tickets" from "anon";

revoke truncate on table "public"."session_tickets" from "anon";

revoke update on table "public"."session_tickets" from "anon";

revoke delete on table "public"."session_tickets" from "authenticated";

revoke insert on table "public"."session_tickets" from "authenticated";

revoke references on table "public"."session_tickets" from "authenticated";

revoke select on table "public"."session_tickets" from "authenticated";

revoke trigger on table "public"."session_tickets" from "authenticated";

revoke truncate on table "public"."session_tickets" from "authenticated";

revoke update on table "public"."session_tickets" from "authenticated";

revoke delete on table "public"."session_tickets" from "service_role";

revoke insert on table "public"."session_tickets" from "service_role";

revoke references on table "public"."session_tickets" from "service_role";

revoke select on table "public"."session_tickets" from "service_role";

revoke trigger on table "public"."session_tickets" from "service_role";

revoke truncate on table "public"."session_tickets" from "service_role";

revoke update on table "public"."session_tickets" from "service_role";

revoke delete on table "public"."tickets" from "anon";

revoke insert on table "public"."tickets" from "anon";

revoke references on table "public"."tickets" from "anon";

revoke select on table "public"."tickets" from "anon";

revoke trigger on table "public"."tickets" from "anon";

revoke truncate on table "public"."tickets" from "anon";

revoke update on table "public"."tickets" from "anon";

revoke delete on table "public"."tickets" from "authenticated";

revoke insert on table "public"."tickets" from "authenticated";

revoke references on table "public"."tickets" from "authenticated";

revoke select on table "public"."tickets" from "authenticated";

revoke trigger on table "public"."tickets" from "authenticated";

revoke truncate on table "public"."tickets" from "authenticated";

revoke update on table "public"."tickets" from "authenticated";

revoke delete on table "public"."tickets" from "service_role";

revoke insert on table "public"."tickets" from "service_role";

revoke references on table "public"."tickets" from "service_role";

revoke select on table "public"."tickets" from "service_role";

revoke trigger on table "public"."tickets" from "service_role";

revoke truncate on table "public"."tickets" from "service_role";

revoke update on table "public"."tickets" from "service_role";

alter table "public"."session_tickets" drop constraint "session_tickets_project_id_fkey";

alter table "public"."session_tickets" drop constraint "session_tickets_session_id_fkey";

alter table "public"."session_tickets" drop constraint "session_tickets_ticket_id_fkey";

alter table "public"."tickets" drop constraint "tickets_destination_id_fkey";

alter table "public"."tickets" drop constraint "tickets_project_id_fkey";

alter table "public"."session_tickets" drop constraint "session_tickets_pkey";

alter table "public"."tickets" drop constraint "tickets_pkey";

drop index if exists "public"."session_tickets_pkey";

drop index if exists "public"."tickets_pkey";

drop table "public"."session_tickets";

drop table "public"."tickets";

create table "public"."project_groups" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "project_id" uuid not null,
    "external_id" text not null,
    "name" text,
    "properties" jsonb
);


alter table "public"."project_groups" enable row level security;

create table "public"."project_users" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "project_id" uuid not null,
    "external_id" text not null,
    "name" text,
    "properties" jsonb,
    "project_group_id" uuid
);


alter table "public"."project_users" enable row level security;

alter table "public"."sessions" drop column "external_group_id";

alter table "public"."sessions" drop column "external_group_name";

alter table "public"."sessions" drop column "external_user_id";

alter table "public"."sessions" drop column "external_user_name";

alter table "public"."sessions" add column "project_group_id" uuid;

alter table "public"."sessions" add column "project_user_id" uuid not null;

CREATE UNIQUE INDEX project_groups_pkey ON public.project_groups USING btree (id);

CREATE UNIQUE INDEX project_users_pkey ON public.project_users USING btree (id);

alter table "public"."project_groups" add constraint "project_groups_pkey" PRIMARY KEY using index "project_groups_pkey";

alter table "public"."project_users" add constraint "project_users_pkey" PRIMARY KEY using index "project_users_pkey";

alter table "public"."project_groups" add constraint "project_groups_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."project_groups" validate constraint "project_groups_project_id_fkey";

alter table "public"."project_users" add constraint "project_users_project_group_id_fkey" FOREIGN KEY (project_group_id) REFERENCES project_groups(id) ON UPDATE CASCADE ON DELETE SET NULL not valid;

alter table "public"."project_users" validate constraint "project_users_project_group_id_fkey";

alter table "public"."project_users" add constraint "project_users_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."project_users" validate constraint "project_users_project_id_fkey";

alter table "public"."sessions" add constraint "sessions_project_group_id_fkey" FOREIGN KEY (project_group_id) REFERENCES project_groups(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."sessions" validate constraint "sessions_project_group_id_fkey";

alter table "public"."sessions" add constraint "sessions_project_user_id_fkey" FOREIGN KEY (project_user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."sessions" validate constraint "sessions_project_user_id_fkey";

grant delete on table "public"."project_groups" to "anon";

grant insert on table "public"."project_groups" to "anon";

grant references on table "public"."project_groups" to "anon";

grant select on table "public"."project_groups" to "anon";

grant trigger on table "public"."project_groups" to "anon";

grant truncate on table "public"."project_groups" to "anon";

grant update on table "public"."project_groups" to "anon";

grant delete on table "public"."project_groups" to "authenticated";

grant insert on table "public"."project_groups" to "authenticated";

grant references on table "public"."project_groups" to "authenticated";

grant select on table "public"."project_groups" to "authenticated";

grant trigger on table "public"."project_groups" to "authenticated";

grant truncate on table "public"."project_groups" to "authenticated";

grant update on table "public"."project_groups" to "authenticated";

grant delete on table "public"."project_groups" to "service_role";

grant insert on table "public"."project_groups" to "service_role";

grant references on table "public"."project_groups" to "service_role";

grant select on table "public"."project_groups" to "service_role";

grant trigger on table "public"."project_groups" to "service_role";

grant truncate on table "public"."project_groups" to "service_role";

grant update on table "public"."project_groups" to "service_role";

grant delete on table "public"."project_users" to "anon";

grant insert on table "public"."project_users" to "anon";

grant references on table "public"."project_users" to "anon";

grant select on table "public"."project_users" to "anon";

grant trigger on table "public"."project_users" to "anon";

grant truncate on table "public"."project_users" to "anon";

grant update on table "public"."project_users" to "anon";

grant delete on table "public"."project_users" to "authenticated";

grant insert on table "public"."project_users" to "authenticated";

grant references on table "public"."project_users" to "authenticated";

grant select on table "public"."project_users" to "authenticated";

grant trigger on table "public"."project_users" to "authenticated";

grant truncate on table "public"."project_users" to "authenticated";

grant update on table "public"."project_users" to "authenticated";

grant delete on table "public"."project_users" to "service_role";

grant insert on table "public"."project_users" to "service_role";

grant references on table "public"."project_users" to "service_role";

grant select on table "public"."project_users" to "service_role";

grant trigger on table "public"."project_users" to "service_role";

grant truncate on table "public"."project_users" to "service_role";

grant update on table "public"."project_users" to "service_role";


