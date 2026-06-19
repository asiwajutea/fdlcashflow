-- Add array columns to profiles for multi-select designations, projects, departments, teams.
-- The existing single FK columns (position_id, department_id, project_id, team_id) are kept
-- for backward compatibility with org-chart and other single-value consumers.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS position_ids  uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS department_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS project_ids   uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS team_ids      uuid[] NOT NULL DEFAULT '{}';

-- Backfill: copy existing single values into the new arrays
UPDATE public.profiles SET position_ids  = ARRAY[position_id]  WHERE position_id  IS NOT NULL AND array_length(position_ids,  1) IS NULL;
UPDATE public.profiles SET department_ids = ARRAY[department_id] WHERE department_id IS NOT NULL AND array_length(department_ids, 1) IS NULL;
UPDATE public.profiles SET project_ids   = ARRAY[project_id]   WHERE project_id   IS NOT NULL AND array_length(project_ids,   1) IS NULL;
UPDATE public.profiles SET team_ids      = ARRAY[team_id]      WHERE team_id      IS NOT NULL AND array_length(team_ids,      1) IS NULL;
