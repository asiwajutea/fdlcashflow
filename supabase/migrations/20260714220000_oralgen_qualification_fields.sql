-- Qualification survey fields captured at booking
ALTER TABLE public.oralgen_interviews
  ADD COLUMN IF NOT EXISTS q_scholarship      boolean DEFAULT NULL,  -- post-secondary children/relatives needing scholarship
  ADD COLUMN IF NOT EXISTS q_vocational       boolean DEFAULT NULL,  -- anyone who can benefit from vocational training
  ADD COLUMN IF NOT EXISTS q_high_school      boolean DEFAULT NULL,  -- children/relatives currently in high school
  ADD COLUMN IF NOT EXISTS q_cooperative      boolean DEFAULT NULL,  -- interested in food-relief cooperative society
  ADD COLUMN IF NOT EXISTS is_draft           boolean NOT NULL DEFAULT false; -- saved as draft, not yet submitted
