GRANT SELECT ON public.job_positions TO anon;
DROP POLICY IF EXISTS "Anon read open jobs" ON public.job_positions;
CREATE POLICY "Anon read open jobs" ON public.job_positions
  FOR SELECT TO anon
  USING (status = 'open');