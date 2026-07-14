-- Extended booking fields for oralgen_interviews
ALTER TABLE public.oralgen_interviews
  ADD COLUMN IF NOT EXISTS first_name              TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS surname                 TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS other_names             TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS house_number            TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS interview_pref          TEXT[] DEFAULT NULL,  -- preferred day/time for the interview itself
  ADD COLUMN IF NOT EXISTS booking_acceptance_rating INTEGER DEFAULT NULL; -- 1-5 rating at booking time
