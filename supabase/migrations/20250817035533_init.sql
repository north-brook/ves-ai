create type "public"."destination_type" as enum ('linear');

create type "public"."source_type" as enum ('posthog');


  create table "public"."destinations" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "project_id" uuid not null,
    "type" destination_type not null,
    "destination_token" text,
    "destination_project" text,
    "destination_team" text,
    "last_active_at" timestamp with time zone
      );


alter table "public"."destinations" enable row level security;


  create table "public"."projects" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "name" text not null,
    "slug" text not null,
    "domain" text not null,
    "image" text not null
      );


alter table "public"."projects" enable row level security;


  create table "public"."roles" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "project_id" uuid not null,
    "user_email" text not null,
    "user_id" uuid
      );


alter table "public"."roles" enable row level security;


  create table "public"."sources" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "project_id" uuid not null,
    "type" source_type not null,
    "source_key" text,
    "source_host" text,
    "source_project" text,
    "last_active_at" timestamp with time zone
      );


alter table "public"."sources" enable row level security;


  create table "public"."users" (
    "id" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "email" text not null,
    "first_name" text,
    "last_name" text,
    "image" text
      );


alter table "public"."users" enable row level security;

CREATE UNIQUE INDEX destinations_pkey ON public.destinations USING btree (id);

CREATE UNIQUE INDEX projects_pkey ON public.projects USING btree (id);

CREATE UNIQUE INDEX roles_pkey ON public.roles USING btree (id);

CREATE UNIQUE INDEX sources_pkey ON public.sources USING btree (id);

CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id);

alter table "public"."destinations" add constraint "destinations_pkey" PRIMARY KEY using index "destinations_pkey";

alter table "public"."projects" add constraint "projects_pkey" PRIMARY KEY using index "projects_pkey";

alter table "public"."roles" add constraint "roles_pkey" PRIMARY KEY using index "roles_pkey";

alter table "public"."sources" add constraint "sources_pkey" PRIMARY KEY using index "sources_pkey";

alter table "public"."users" add constraint "users_pkey" PRIMARY KEY using index "users_pkey";

alter table "public"."destinations" add constraint "destinations_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."destinations" validate constraint "destinations_project_id_fkey";

alter table "public"."roles" add constraint "roles_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."roles" validate constraint "roles_project_id_fkey";

alter table "public"."roles" add constraint "roles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."roles" validate constraint "roles_user_id_fkey";

alter table "public"."sources" add constraint "sources_project_id_fkey" FOREIGN KEY (project_id) REFERENCES projects(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."sources" validate constraint "sources_project_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.project_access(project_id uuid, user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.roles
        WHERE roles.project_id = $1 AND roles.user_id = $2
    );
END;$function$
;

grant delete on table "public"."destinations" to "anon";

grant insert on table "public"."destinations" to "anon";

grant references on table "public"."destinations" to "anon";

grant select on table "public"."destinations" to "anon";

grant trigger on table "public"."destinations" to "anon";

grant truncate on table "public"."destinations" to "anon";

grant update on table "public"."destinations" to "anon";

grant delete on table "public"."destinations" to "authenticated";

grant insert on table "public"."destinations" to "authenticated";

grant references on table "public"."destinations" to "authenticated";

grant select on table "public"."destinations" to "authenticated";

grant trigger on table "public"."destinations" to "authenticated";

grant truncate on table "public"."destinations" to "authenticated";

grant update on table "public"."destinations" to "authenticated";

grant delete on table "public"."destinations" to "service_role";

grant insert on table "public"."destinations" to "service_role";

grant references on table "public"."destinations" to "service_role";

grant select on table "public"."destinations" to "service_role";

grant trigger on table "public"."destinations" to "service_role";

grant truncate on table "public"."destinations" to "service_role";

grant update on table "public"."destinations" to "service_role";

grant delete on table "public"."projects" to "anon";

grant insert on table "public"."projects" to "anon";

grant references on table "public"."projects" to "anon";

grant select on table "public"."projects" to "anon";

grant trigger on table "public"."projects" to "anon";

grant truncate on table "public"."projects" to "anon";

grant update on table "public"."projects" to "anon";

grant delete on table "public"."projects" to "authenticated";

grant insert on table "public"."projects" to "authenticated";

grant references on table "public"."projects" to "authenticated";

grant select on table "public"."projects" to "authenticated";

grant trigger on table "public"."projects" to "authenticated";

grant truncate on table "public"."projects" to "authenticated";

grant update on table "public"."projects" to "authenticated";

grant delete on table "public"."projects" to "service_role";

grant insert on table "public"."projects" to "service_role";

grant references on table "public"."projects" to "service_role";

grant select on table "public"."projects" to "service_role";

grant trigger on table "public"."projects" to "service_role";

grant truncate on table "public"."projects" to "service_role";

grant update on table "public"."projects" to "service_role";

grant delete on table "public"."roles" to "anon";

grant insert on table "public"."roles" to "anon";

grant references on table "public"."roles" to "anon";

grant select on table "public"."roles" to "anon";

grant trigger on table "public"."roles" to "anon";

grant truncate on table "public"."roles" to "anon";

grant update on table "public"."roles" to "anon";

grant delete on table "public"."roles" to "authenticated";

grant insert on table "public"."roles" to "authenticated";

grant references on table "public"."roles" to "authenticated";

grant select on table "public"."roles" to "authenticated";

grant trigger on table "public"."roles" to "authenticated";

grant truncate on table "public"."roles" to "authenticated";

grant update on table "public"."roles" to "authenticated";

grant delete on table "public"."roles" to "service_role";

grant insert on table "public"."roles" to "service_role";

grant references on table "public"."roles" to "service_role";

grant select on table "public"."roles" to "service_role";

grant trigger on table "public"."roles" to "service_role";

grant truncate on table "public"."roles" to "service_role";

grant update on table "public"."roles" to "service_role";

grant delete on table "public"."sources" to "anon";

grant insert on table "public"."sources" to "anon";

grant references on table "public"."sources" to "anon";

grant select on table "public"."sources" to "anon";

grant trigger on table "public"."sources" to "anon";

grant truncate on table "public"."sources" to "anon";

grant update on table "public"."sources" to "anon";

grant delete on table "public"."sources" to "authenticated";

grant insert on table "public"."sources" to "authenticated";

grant references on table "public"."sources" to "authenticated";

grant select on table "public"."sources" to "authenticated";

grant trigger on table "public"."sources" to "authenticated";

grant truncate on table "public"."sources" to "authenticated";

grant update on table "public"."sources" to "authenticated";

grant delete on table "public"."sources" to "service_role";

grant insert on table "public"."sources" to "service_role";

grant references on table "public"."sources" to "service_role";

grant select on table "public"."sources" to "service_role";

grant trigger on table "public"."sources" to "service_role";

grant truncate on table "public"."sources" to "service_role";

grant update on table "public"."sources" to "service_role";

grant delete on table "public"."users" to "anon";

grant insert on table "public"."users" to "anon";

grant references on table "public"."users" to "anon";

grant select on table "public"."users" to "anon";

grant trigger on table "public"."users" to "anon";

grant truncate on table "public"."users" to "anon";

grant update on table "public"."users" to "anon";

grant delete on table "public"."users" to "authenticated";

grant insert on table "public"."users" to "authenticated";

grant references on table "public"."users" to "authenticated";

grant select on table "public"."users" to "authenticated";

grant trigger on table "public"."users" to "authenticated";

grant truncate on table "public"."users" to "authenticated";

grant update on table "public"."users" to "authenticated";

grant delete on table "public"."users" to "service_role";

grant insert on table "public"."users" to "service_role";

grant references on table "public"."users" to "service_role";

grant select on table "public"."users" to "service_role";

grant trigger on table "public"."users" to "service_role";

grant truncate on table "public"."users" to "service_role";

grant update on table "public"."users" to "service_role";


  create policy "Users can manage their project destinations"
  on "public"."destinations"
  as permissive
  for all
  to authenticated
using (project_access(project_id, ( SELECT auth.uid() AS uid)));



  create policy "Users can manage their projects"
  on "public"."projects"
  as permissive
  for all
  to authenticated
using (project_access(id, ( SELECT auth.uid() AS uid)));



  create policy "Users can manage their colleagues"
  on "public"."roles"
  as permissive
  for all
  to public
using (project_access(project_id, ( SELECT auth.uid() AS uid)));



  create policy "Users can see their roles"
  on "public"."roles"
  as permissive
  for select
  to authenticated
using ((user_id = ( SELECT auth.uid() AS uid)));



  create policy "Users can manage their project sources"
  on "public"."sources"
  as permissive
  for all
  to authenticated
using (project_access(project_id, ( SELECT auth.uid() AS uid)));



  create policy "Users can manage themselves"
  on "public"."users"
  as permissive
  for all
  to authenticated
using ((id = ( SELECT auth.uid() AS uid)))
with check ((id = ( SELECT auth.uid() AS uid)));



