CREATE UNIQUE INDEX IF NOT EXISTS sessions_project_external_unique 
ON public.sessions (project_id, external_id);