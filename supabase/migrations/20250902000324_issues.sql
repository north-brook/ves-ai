create type "public"."issue_confidence" as enum ('low', 'medium', 'high');

drop policy "Project members can manage pages" on "public"."pages";

drop policy "Project members can manage session pages" on "public"."session_pages";

revoke delete on table "public"."pages" from "anon";

revoke insert on table "public"."pages" from "anon";

revoke references on table "public"."pages" from "anon";

revoke select on table "public"."pages" from "anon";

revoke trigger on table "public"."pages" from "anon";

revoke truncate on table "public"."pages" from "anon";

revoke update on table "public"."pages" from "anon";

revoke delete on table "public"."pages" from "authenticated";

revoke insert on table "public"."pages" from "authenticated";

revoke references on table "public"."pages" from "authenticated";

revoke select on table "public"."pages" from "authenticated";

revoke trigger on table "public"."pages" from "authenticated";

revoke truncate on table "public"."pages" from "authenticated";

revoke update on table "public"."pages" from "authenticated";

revoke delete on table "public"."pages" from "service_role";

revoke insert on table "public"."pages" from "service_role";

revoke references on table "public"."pages" from "service_role";

revoke select on table "public"."pages" from "service_role";

revoke trigger on table "public"."pages" from "service_role";

revoke truncate on table "public"."pages" from "service_role";

revoke update on table "public"."pages" from "service_role";

revoke delete on table "public"."session_pages" from "anon";

revoke insert on table "public"."session_pages" from "anon";

revoke references on table "public"."session_pages" from "anon";

revoke select on table "public"."session_pages" from "anon";

revoke trigger on table "public"."session_pages" from "anon";

revoke truncate on table "public"."session_pages" from "anon";

revoke update on table "public"."session_pages" from "anon";

revoke delete on table "public"."session_pages" from "authenticated";

revoke insert on table "public"."session_pages" from "authenticated";

revoke references on table "public"."session_pages" from "authenticated";

revoke select on table "public"."session_pages" from "authenticated";

revoke trigger on table "public"."session_pages" from "authenticated";

revoke truncate on table "public"."session_pages" from "authenticated";

revoke update on table "public"."session_pages" from "authenticated";

revoke delete on table "public"."session_pages" from "service_role";

revoke insert on table "public"."session_pages" from "service_role";

revoke references on table "public"."session_pages" from "service_role";

revoke select on table "public"."session_pages" from "service_role";

revoke trigger on table "public"."session_pages" from "service_role";

revoke truncate on table "public"."session_pages" from "service_role";

revoke update on table "public"."session_pages" from "service_role";

alter table "public"."pages" drop constraint "pages_project_id_fkey";

alter table "public"."session_pages" drop constraint "session_pages_page_id_fkey";

alter table "public"."session_pages" drop constraint "session_pages_project_id_fkey";

alter table "public"."session_pages" drop constraint "session_pages_session_id_fkey";

alter table "public"."pages" drop constraint "pages_pkey";

alter table "public"."session_pages" drop constraint "session_pages_pkey";

alter table "public"."session_issues" drop constraint "session_issues_pkey";

drop index if exists "public"."pages_pkey";

drop index if exists "public"."session_pages_pkey";

drop index if exists "public"."session_issues_pkey";

drop table "public"."pages";

drop table "public"."session_pages";

alter table "public"."issues" add column "confidence" issue_confidence not null;

alter table "public"."session_issues" drop column "id";

alter table "public"."sessions" drop column "detected_pages";

alter table "public"."sessions" add column "features" text[];

CREATE UNIQUE INDEX session_issues_pkey ON public.session_issues USING btree (session_id, issue_id);

alter table "public"."session_issues" add constraint "session_issues_pkey" PRIMARY KEY using index "session_issues_pkey";

alter publication supabase_realtime
add table issues;

alter publication supabase_realtime
add table project_users;

alter publication supabase_realtime
add table project_groups;
