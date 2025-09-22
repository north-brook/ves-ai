alter type "public"."project_plan" rename to "project_plan__old_version_to_be_dropped";

create type "public"."project_plan" as enum ('starter', 'growth', 'scale', 'enterprise');

alter table "public"."projects" alter column plan type "public"."project_plan" using plan::text::"public"."project_plan";

drop type "public"."project_plan__old_version_to_be_dropped";


