-- Add completion fields captured when interviewer marks interview as done
ALTER TABLE public.oralgen_interviews
  ADD COLUMN IF NOT EXISTS folder_name       TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS total_names       INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS audit_pref        TEXT[] DEFAULT NULL,  -- e.g. ["Monday","morning"]
  ADD COLUMN IF NOT EXISTS acceptance_rating INTEGER DEFAULT NULL; -- 1-5
