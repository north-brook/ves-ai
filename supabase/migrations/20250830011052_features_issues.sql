create type "public"."feature_status" as enum ('pending', 'analyzing', 'analyzed', 'failed');

create type "public"."issue_priority" as enum ('immediate', 'high', 'medium', 'low', 'backlog');

create type "public"."issue_severity" as enum ('critical', 'high', 'medium', 'low', 'suggestion');

create type "public"."issue_status" as enum ('backlog', 'todo', 'in_progress', 'in_review', 'done', 'canceled', 'duplicate');

create type "public"."issue_type" as enum ('bug', 'usability', 'improvement', 'feature');

create type "public"."project_group_status" as enum ('pending', 'analyzing', 'analyzed', 'failed');

create type "public"."project_user_status" as enum ('pending', 'analyzing', 'analyzed', 'failed');

alter table "public"."sessions" drop constraint "sessions_project_user_id_fkey";

create table "public"."features" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "project_id" uuid not null,
    "name" text not null,
    "description" text not null,
    "status" feature_status not null,
    "story" text,
    "health" text,
    "score" numeric,
    "analyzed_at" timestamp with time zone,
    "analysis_hash" text,
    "embedding" vector
);


alter table "public"."features" enable row level security;

create table "public"."issues" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "project_id" uuid not null,
    "name" text not null,
    "description" text not null,
    "type" issue_type not null,
    "severity" issue_severity not null,
    "priority" issue_priority not null,
    "external_id" text,
    "status" issue_status,
    "embedding" vector
);


alter table "public"."issues" enable row level security;

create table "public"."session_features" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "project_id" uuid not null,
    "session_id" uuid not null,
    "feature_id" uuid not null
);


alter table "public"."session_features" enable row level security;

create table "public"."session_issues" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "session_id" uuid not null,
    "issue_id" uuid not null,
    "project_id" uuid not null
);


alter table "public"."session_issues" enable row level security;

alter table "public"."destinations" drop column "destination_token";

alter table "public"."destinations" add column "destination_access_token" text;

alter table "public"."destinations" add column "destination_refresh_token" text;

alter table "public"."project_groups" add column "analysis_hash" text;

alter table "public"."project_groups" add column "health" text;

alter table "public"."project_groups" add column "last_analyzed_at" timestamp with time zone;

alter table "public"."project_groups" add column "score" numeric;

alter table "public"."project_groups" add column "status" project_group_status not null;

alter table "public"."project_groups" add column "story" text;

alter table "public"."project_users" add column "analysis_hash" text;

alter table "public"."project_users" add column "health" text;

alter table "public"."project_users" add column "last_analyzed_at" timestamp with time zone;

alter table "public"."project_users" add column "score" numeric;

alter table "public"."project_users" add column "status" project_user_status not null;

alter table "public"."project_users" add column "story" text;

alter table "public"."sessions" drop column "features";

alter table "public"."sessions" add column "detected_features" jsonb[];

alter table "public"."sessions" add column "detected_issues" jsonb[];

alter table "public"."sessions" add column "health" text;

alter table "public"."sessions" add column "score" numeric;

CREATE UNIQUE INDEX features_pkey ON public.features USING btree (id);

CREATE UNIQUE INDEX issues_pkey ON public.issues USING btree (id);

CREATE UNIQUE INDEX session_features_pkey ON public.session_features USING btree (id);

CREATE UNIQUE INDEX session_issues_pkey ON public.session_issues USING btree (id);

alter table "public"."features" add constraint "features_pkey" PRIMARY KEY using index "features_pkey";

alter table "public"."issues" add constraint "issues_pkey" PRIMARY KEY using index "issues_pkey";

alter table "public"."session_features" add constraint "session_features_pkey" PRIMARY KEY using index "session_features_pkey";

alter table "public"."session_issues" add constraint "session_issues_pkey" PRIMARY KEY using index "session_issues_pkey";

alter table "public"."features" add constraint "features_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."features" validate constraint "features_project_id_fkey";

alter table "public"."issues" add constraint "issues_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."issues" validate constraint "issues_project_id_fkey";

alter table "public"."session_features" add constraint "session_features_feature_id_fkey" FOREIGN KEY (feature_id) REFERENCES features(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."session_features" validate constraint "session_features_feature_id_fkey";

alter table "public"."session_features" add constraint "session_features_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."session_features" validate constraint "session_features_project_id_fkey";

alter table "public"."session_features" add constraint "session_features_session_id_fkey" FOREIGN KEY (session_id) REFERENCES sessions(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."session_features" validate constraint "session_features_session_id_fkey";

alter table "public"."session_issues" add constraint "session_issues_issue_id_fkey" FOREIGN KEY (issue_id) REFERENCES issues(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."session_issues" validate constraint "session_issues_issue_id_fkey";

alter table "public"."session_issues" add constraint "session_issues_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."session_issues" validate constraint "session_issues_project_id_fkey";

alter table "public"."session_issues" add constraint "session_issues_session_id_fkey" FOREIGN KEY (session_id) REFERENCES sessions(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."session_issues" validate constraint "session_issues_session_id_fkey";

alter table "public"."sessions" add constraint "sessions_project_user_id_fkey1" FOREIGN KEY (project_user_id) REFERENCES project_users(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."sessions" validate constraint "sessions_project_user_id_fkey1";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.match_features(query_embedding vector, match_threshold double precision, match_count integer)
 RETURNS TABLE(id uuid, similarity double precision)
 LANGUAGE sql
 STABLE
AS $function$
  select
    f.id,
    1 - (f.embedding <=> query_embedding) as similarity -- cosine similarity = 1 - cosine distance
  from features f
  where f.embedding is not null
    and f.embedding <=> query_embedding < 1 - match_threshold
  order by f.embedding <=> query_embedding -- smaller distance = closer match
  limit match_count;
$function$
;

CREATE OR REPLACE FUNCTION public.match_issues(query_embedding vector, match_threshold double precision, match_count integer)
 RETURNS TABLE(id uuid, similarity double precision)
 LANGUAGE sql
 STABLE
AS $function$
  select
    i.id,
    1 - (i.embedding <=> query_embedding) as similarity -- cosine similarity = 1 - cosine distance
  from issues i
  where i.embedding is not null
    and i.embedding <=> query_embedding < 1 - match_threshold
  order by i.embedding <=> query_embedding -- smaller distance = closer match
  limit match_count;
$function$
;

grant delete on table "public"."features" to "anon";

grant insert on table "public"."features" to "anon";

grant references on table "public"."features" to "anon";

grant select on table "public"."features" to "anon";

grant trigger on table "public"."features" to "anon";

grant truncate on table "public"."features" to "anon";

grant update on table "public"."features" to "anon";

grant delete on table "public"."features" to "authenticated";

grant insert on table "public"."features" to "authenticated";

grant references on table "public"."features" to "authenticated";

grant select on table "public"."features" to "authenticated";

grant trigger on table "public"."features" to "authenticated";

grant truncate on table "public"."features" to "authenticated";

grant update on table "public"."features" to "authenticated";

grant delete on table "public"."features" to "service_role";

grant insert on table "public"."features" to "service_role";

grant references on table "public"."features" to "service_role";

grant select on table "public"."features" to "service_role";

grant trigger on table "public"."features" to "service_role";

grant truncate on table "public"."features" to "service_role";

grant update on table "public"."features" to "service_role";

grant delete on table "public"."issues" to "anon";

grant insert on table "public"."issues" to "anon";

grant references on table "public"."issues" to "anon";

grant select on table "public"."issues" to "anon";

grant trigger on table "public"."issues" to "anon";

grant truncate on table "public"."issues" to "anon";

grant update on table "public"."issues" to "anon";

grant delete on table "public"."issues" to "authenticated";

grant insert on table "public"."issues" to "authenticated";

grant references on table "public"."issues" to "authenticated";

grant select on table "public"."issues" to "authenticated";

grant trigger on table "public"."issues" to "authenticated";

grant truncate on table "public"."issues" to "authenticated";

grant update on table "public"."issues" to "authenticated";

grant delete on table "public"."issues" to "service_role";

grant insert on table "public"."issues" to "service_role";

grant references on table "public"."issues" to "service_role";

grant select on table "public"."issues" to "service_role";

grant trigger on table "public"."issues" to "service_role";

grant truncate on table "public"."issues" to "service_role";

grant update on table "public"."issues" to "service_role";

grant delete on table "public"."session_features" to "anon";

grant insert on table "public"."session_features" to "anon";

grant references on table "public"."session_features" to "anon";

grant select on table "public"."session_features" to "anon";

grant trigger on table "public"."session_features" to "anon";

grant truncate on table "public"."session_features" to "anon";

grant update on table "public"."session_features" to "anon";

grant delete on table "public"."session_features" to "authenticated";

grant insert on table "public"."session_features" to "authenticated";

grant references on table "public"."session_features" to "authenticated";

grant select on table "public"."session_features" to "authenticated";

grant trigger on table "public"."session_features" to "authenticated";

grant truncate on table "public"."session_features" to "authenticated";

grant update on table "public"."session_features" to "authenticated";

grant delete on table "public"."session_features" to "service_role";

grant insert on table "public"."session_features" to "service_role";

grant references on table "public"."session_features" to "service_role";

grant select on table "public"."session_features" to "service_role";

grant trigger on table "public"."session_features" to "service_role";

grant truncate on table "public"."session_features" to "service_role";

grant update on table "public"."session_features" to "service_role";

grant delete on table "public"."session_issues" to "anon";

grant insert on table "public"."session_issues" to "anon";

grant references on table "public"."session_issues" to "anon";

grant select on table "public"."session_issues" to "anon";

grant trigger on table "public"."session_issues" to "anon";

grant truncate on table "public"."session_issues" to "anon";

grant update on table "public"."session_issues" to "anon";

grant delete on table "public"."session_issues" to "authenticated";

grant insert on table "public"."session_issues" to "authenticated";

grant references on table "public"."session_issues" to "authenticated";

grant select on table "public"."session_issues" to "authenticated";

grant trigger on table "public"."session_issues" to "authenticated";

grant truncate on table "public"."session_issues" to "authenticated";

grant update on table "public"."session_issues" to "authenticated";

grant delete on table "public"."session_issues" to "service_role";

grant insert on table "public"."session_issues" to "service_role";

grant references on table "public"."session_issues" to "service_role";

grant select on table "public"."session_issues" to "service_role";

grant trigger on table "public"."session_issues" to "service_role";

grant truncate on table "public"."session_issues" to "service_role";

grant update on table "public"."session_issues" to "service_role";

create policy "Project members can manage issues"
on "public"."issues"
as permissive
for all
to authenticated
using (project_access(project_id, ( SELECT auth.uid() AS uid)));


create policy "Project members can manage groups"
on "public"."project_groups"
as permissive
for all
to authenticated
using (project_access(project_id, ( SELECT auth.uid() AS uid)));


create policy "Project members can manage users"
on "public"."project_users"
as permissive
for all
to authenticated
using (project_access(project_id, ( SELECT auth.uid() AS uid)));



