drop function if exists "public"."match_features"(query_embedding vector, match_threshold double precision, match_count integer);

drop function if exists "public"."match_issues"(query_embedding vector, match_threshold double precision, match_count integer);

drop function if exists "public"."match_sessions"(query_embedding vector, match_threshold double precision, match_count integer);

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.match_issues(query_embedding vector, match_threshold double precision, match_count integer, project_id uuid)
 RETURNS TABLE(id uuid, similarity double precision)
 LANGUAGE sql
 STABLE
AS $function$
  select
    i.id,
    1 - (i.embedding <=> $1) as similarity -- cosine similarity = 1 - cosine distance
  from issues i
  where i.embedding is not null
    and i.embedding <=> $1 < 1 - $2 and i.project_id = $4
  order by i.embedding <=> $1 -- smaller distance = closer match
  limit $3;
$function$
;

CREATE OR REPLACE FUNCTION public.match_sessions(query_embedding vector, match_threshold double precision, match_count integer, project_id uuid)
 RETURNS TABLE(id uuid, similarity double precision)
 LANGUAGE sql
 STABLE
AS $function$
  select
    s.id,
    1 - (s.embedding <=> $1) as similarity -- cosine similarity = 1 - cosine distance
  from sessions s
  where s.embedding is not null
    and s.embedding <=> $1 < 1 - $2 and s.project_id = $4
  order by s.embedding <=> $1 -- smaller distance = closer match
  limit $3;
$function$
;


