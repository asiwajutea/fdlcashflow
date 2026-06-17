-- Grant HR staff full read access to candidates table (needed for the !inner join in fetchApplications)
CREATE POLICY "HR staff can read all candidates"
ON public.candidates FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_capabilities WHERE user_id = auth.uid() AND capability = 'manage_recruitment')
);
