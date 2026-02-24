ALTER TABLE public.job_positions 
  ADD COLUMN IF NOT EXISTS key_responsibilities text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS job_type text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS compensation text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS work_location_country text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS work_location_state text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS media_url text DEFAULT NULL;