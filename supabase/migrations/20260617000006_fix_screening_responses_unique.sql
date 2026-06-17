-- screening_responses had no UNIQUE constraint on application_id, causing
-- duplicate rows. maybeSingle() returns null when >1 row exists, making
-- the screening dialog show "No screening data found".
-- Fix: keep only the latest row per application, then add the constraint.

-- 1. Delete all but the most recent row per application_id
DELETE FROM public.screening_responses
WHERE id NOT IN (
  SELECT DISTINCT ON (application_id) id
  FROM public.screening_responses
  ORDER BY application_id, submitted_at DESC
);

-- 2. Add unique constraint so upsert works correctly going forward
ALTER TABLE public.screening_responses
  ADD CONSTRAINT screening_responses_application_id_key UNIQUE (application_id);
