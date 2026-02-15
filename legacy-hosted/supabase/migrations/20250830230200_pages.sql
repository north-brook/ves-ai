create type "public"."page_status" as enum ('pending', 'analyzing', 'analyzed', 'failed');

revoke delete on table "public"."features" from "anon";

revoke insert on table "public"."features" from "anon";

revoke references on table "public"."features" from "anon";

revoke select on table "public"."features" from "anon";

revoke trigger on table "public"."features" from "anon";

revoke truncate on table "public"."features" from "anon";

revoke update on table "public"."features" from "anon";

revoke delete on table "public"."features" from "authenticated";

revoke insert on table "public"."features" from "authenticated";

revoke references on table "public"."features" from "authenticated";

revoke select on table "public"."features" from "authenticated";

revoke trigger on table "public"."features" from "authenticated";

revoke truncate on table "public"."features" from "authenticated";

revoke update on table "public"."features" from "authenticated";

revoke delete on table "public"."features" from "service_role";

revoke insert on table "public"."features" from "service_role";

revoke references on table "public"."features" from "service_role";

revoke select on table "public"."features" from "service_role";

revoke trigger on table "public"."features" from "service_role";

revoke truncate on table "public"."features" from "service_role";

revoke update on table "public"."features" from "service_role";

revoke delete on table "public"."session_features" from "anon";

revoke insert on table "public"."session_features" from "anon";

revoke references on table "public"."session_features" from "anon";

revoke select on table "public"."session_features" from "anon";

revoke trigger on table "public"."session_features" from "anon";

revoke truncate on table "public"."session_features" from "anon";

revoke update on table "public"."session_features" from "anon";

revoke delete on table "public"."session_features" from "authenticated";

revoke insert on table "public"."session_features" from "authenticated";

revoke references on table "public"."session_features" from "authenticated";

revoke select on table "public"."session_features" from "authenticated";

revoke trigger on table "public"."session_features" from "authenticated";

revoke truncate on table "public"."session_features" from "authenticated";

revoke update on table "public"."session_features" from "authenticated";

revoke delete on table "public"."session_features" from "service_role";

revoke insert on table "public"."session_features" from "service_role";

revoke references on table "public"."session_features" from "service_role";

revoke select on table "public"."session_features" from "service_role";

revoke trigger on table "public"."session_features" from "service_role";

revoke truncate on table "public"."session_features" from "service_role";

revoke update on table "public"."session_features" from "service_role";

alter table "public"."features" drop constraint "features_project_id_fkey";

alter table "public"."session_features" drop constraint "session_features_feature_id_fkey";

alter table "public"."session_features" drop constraint "session_features_project_id_fkey";

alter table "public"."session_features" drop constraint "session_features_session_id_fkey";

alter table "public"."features" drop constraint "features_pkey";

alter table "public"."session_features" drop constraint "session_features_pkey";

drop index if exists "public"."features_pkey";

drop index if exists "public"."session_features_pkey";

drop table "public"."features";

drop table "public"."session_features";

create table "public"."pages" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "analyzed_at" timestamp with time zone,
    "path" text not null,
    "story" text,
    "health" text,
    "score" numeric,
    "project_id" uuid not null,
    "analysis_hash" text,
    "status" page_status not null
);


alter table "public"."pages" enable row level security;

create table "public"."session_pages" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "project_id" uuid not null,
    "session_id" uuid not null,
    "page_id" uuid not null,
    "story" text not null,
    "times" jsonb not null
);


alter table "public"."session_pages" enable row level security;

alter table "public"."issues" drop column "description";

alter table "public"."issues" add column "story" text not null;

alter table "public"."session_issues" add column "story" text not null;

alter table "public"."session_issues" add column "times" jsonb not null;

alter table "public"."sessions" drop column "detected_features";

alter table "public"."sessions" add column "detected_pages" jsonb[];

drop type "public"."feature_status";

CREATE UNIQUE INDEX pages_pkey ON public.pages USING btree (id);

CREATE UNIQUE INDEX session_pages_pkey ON public.session_pages USING btree (id);

alter table "public"."pages" add constraint "pages_pkey" PRIMARY KEY using index "pages_pkey";

alter table "public"."session_pages" add constraint "session_pages_pkey" PRIMARY KEY using index "session_pages_pkey";

alter table "public"."pages" add constraint "pages_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."pages" validate constraint "pages_project_id_fkey";

alter table "public"."session_pages" add constraint "session_pages_page_id_fkey" FOREIGN KEY (page_id) REFERENCES pages(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."session_pages" validate constraint "session_pages_page_id_fkey";

alter table "public"."session_pages" add constraint "session_pages_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."session_pages" validate constraint "session_pages_project_id_fkey";

alter table "public"."session_pages" add constraint "session_pages_session_id_fkey" FOREIGN KEY (session_id) REFERENCES sessions(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."session_pages" validate constraint "session_pages_session_id_fkey";

grant delete on table "public"."pages" to "anon";

grant insert on table "public"."pages" to "anon";

grant references on table "public"."pages" to "anon";

grant select on table "public"."pages" to "anon";

grant trigger on table "public"."pages" to "anon";

grant truncate on table "public"."pages" to "anon";

grant update on table "public"."pages" to "anon";

grant delete on table "public"."pages" to "authenticated";

grant insert on table "public"."pages" to "authenticated";

grant references on table "public"."pages" to "authenticated";

grant select on table "public"."pages" to "authenticated";

grant trigger on table "public"."pages" to "authenticated";

grant truncate on table "public"."pages" to "authenticated";

grant update on table "public"."pages" to "authenticated";

grant delete on table "public"."pages" to "service_role";

grant insert on table "public"."pages" to "service_role";

grant references on table "public"."pages" to "service_role";

grant select on table "public"."pages" to "service_role";

grant trigger on table "public"."pages" to "service_role";

grant truncate on table "public"."pages" to "service_role";

grant update on table "public"."pages" to "service_role";

grant delete on table "public"."session_pages" to "anon";

grant insert on table "public"."session_pages" to "anon";

grant references on table "public"."session_pages" to "anon";

grant select on table "public"."session_pages" to "anon";

grant trigger on table "public"."session_pages" to "anon";

grant truncate on table "public"."session_pages" to "anon";

grant update on table "public"."session_pages" to "anon";

grant delete on table "public"."session_pages" to "authenticated";

grant insert on table "public"."session_pages" to "authenticated";

grant references on table "public"."session_pages" to "authenticated";

grant select on table "public"."session_pages" to "authenticated";

grant trigger on table "public"."session_pages" to "authenticated";

grant truncate on table "public"."session_pages" to "authenticated";

grant update on table "public"."session_pages" to "authenticated";

grant delete on table "public"."session_pages" to "service_role";

grant insert on table "public"."session_pages" to "service_role";

grant references on table "public"."session_pages" to "service_role";

grant select on table "public"."session_pages" to "service_role";

grant trigger on table "public"."session_pages" to "service_role";

grant truncate on table "public"."session_pages" to "service_role";

grant update on table "public"."session_pages" to "service_role";

create policy "Project members can manage pages"
on "public"."pages"
as permissive
for all
to authenticated
using (project_access(project_id, ( SELECT auth.uid() AS uid)));


create policy "Project members can manage session issues"
on "public"."session_issues"
as permissive
for all
to authenticated
using (project_access(project_id, ( SELECT auth.uid() AS uid)));


create policy "Project members can manage session pages"
on "public"."session_pages"
as permissive
for all
to authenticated
using (project_access(project_id, ( SELECT auth.uid() AS uid)));



