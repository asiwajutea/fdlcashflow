-- ─── Fix: field agents (oralgen_interview) can insert their own records ───────
--
-- The "Record New Interview" form (DirectInterviewForm) lets field agents
-- create a complete record in one step, landing it directly in awaiting_audit.
-- The original oralgen_insert policy only permitted oralgen_book and
-- oralgen_admin, so field agents received:
--   "new row violates row-level security policy for table oralgen_interviews"
--
-- Fix: extend the INSERT policy to also allow oralgen_interview capability.

DROP POLICY IF EXISTS "oralgen_insert" ON public.oralgen_interviews;

CREATE POLICY "oralgen_insert" ON public.oralgen_interviews
FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid() AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.user_has_capability(auth.uid(), 'oralgen_book')
    OR public.user_has_capability(auth.uid(), 'oralgen_interview')
    OR public.user_has_capability(auth.uid(), 'oralgen_admin')
  )
);
