-- Add session_at column to project_groups
alter table "public"."project_groups" add column "session_at" timestamp with time zone;

-- Create trigger function to update project_groups.session_at
create or replace function update_project_group_session_at()
returns trigger as $$
begin
  update project_groups
  set session_at = (
    select max(session_at)
    from sessions
    where project_group_id = new.project_group_id
  )
  where id = new.project_group_id;
  return new;
end;
$$ language plpgsql;

-- Create trigger on sessions table for project_groups
create trigger trigger_update_project_group_session_at
after insert or update on sessions
for each row
when (new.project_group_id is not null)
execute function update_project_group_session_at();

-- Create trigger function to update project_users.session_at
create or replace function update_project_user_session_at()
returns trigger as $$
begin
  update project_users
  set session_at = (
    select max(session_at)
    from sessions
    where project_user_id = new.project_user_id
  )
  where id = new.project_user_id;
  return new;
end;
$$ language plpgsql;

-- Create trigger on sessions table for project_users
create trigger trigger_update_project_user_session_at
after insert or update on sessions
for each row
execute function update_project_user_session_at();

-- Backfill project_groups.session_at with existing session data
update project_groups pg
set session_at = (
  select max(s.session_at)
  from sessions s
  where s.project_group_id = pg.id
)
where exists (
  select 1
  from sessions s
  where s.project_group_id = pg.id
);

-- Backfill project_users.session_at with existing session data
update project_users pu
set session_at = (
  select max(s.session_at)
  from sessions s
  where s.project_user_id = pu.id
)
where exists (
  select 1
  from sessions s
  where s.project_user_id = pu.id
);

-- Disable realtime on tables to reduce event noise
alter publication supabase_realtime drop table sessions;
alter publication supabase_realtime drop table project_users;
alter publication supabase_realtime drop table project_groups;
