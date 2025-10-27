-- Add unique constraints to prevent duplicate project_users and project_groups
-- This allows upsert operations on (project_id, external_id) combinations

CREATE UNIQUE INDEX IF NOT EXISTS project_groups_project_external_unique 
ON public.project_groups (project_id, external_id);

CREATE UNIQUE INDEX IF NOT EXISTS project_users_project_external_unique 
ON public.project_users (project_id, external_id);