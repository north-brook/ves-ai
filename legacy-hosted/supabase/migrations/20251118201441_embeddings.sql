-- Remove embedding column from sessions table
ALTER TABLE "public"."sessions" DROP COLUMN IF EXISTS "embedding";

-- Remove embedding column from issues table (if it exists)
ALTER TABLE "public"."issues" DROP COLUMN IF EXISTS "embedding";

-- Drop existing match functions
DROP FUNCTION IF EXISTS "public"."match_sessions"("query_embedding" "extensions"."vector", "match_threshold" double precision, "match_count" integer);

DROP FUNCTION IF EXISTS "public"."match_issues"("query_embedding" "extensions"."vector", "match_threshold" double precision, "match_count" integer);

-- Add new embeddings columns
ALTER TABLE "public"."sessions" ADD COLUMN IF NOT EXISTS "embedding" extensions.vector(512);
ALTER TABLE "public"."issues" ADD COLUMN IF NOT EXISTS "embedding" extensions.vector(512);

-- Create new match functions
CREATE OR REPLACE FUNCTION "public"."match_sessions"("query_embedding" extensions.vector(512), "match_threshold" double precision, "match_count" integer) RETURNS TABLE("id" "uuid", "similarity" double precision)
        LANGUAGE "sql" STABLE
        AS $$
    select
        s.id,
        1 - (s.embedding <=> query_embedding) as similarity  -- cosine_similarity = 1 - cosine_distance
    from sessions s
    where s.embedding is not null
        and s.embedding <=> query_embedding < 1 - match_threshold
    order by s.embedding <=> query_embedding                -- smaller distance = closer match
    limit match_count;
    $$;

CREATE OR REPLACE FUNCTION "public"."match_issues"("query_embedding" extensions.vector(512), "match_threshold" double precision, "match_count" integer) RETURNS TABLE("id" "uuid", "similarity" double precision)
        LANGUAGE "sql" STABLE
    AS $$
    select
        i.id,
        1 - (i.embedding <=> query_embedding) as similarity  -- cosine_similarity = 1 - cosine_distance
    from issues i
    where i.embedding is not null
        and i.embedding <=> query_embedding < 1 - match_threshold
    order by i.embedding <=> query_embedding                -- smaller distance = closer match
    limit match_count;
    $$;