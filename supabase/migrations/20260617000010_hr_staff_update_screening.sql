-- HR staff with manage_recruitment capability can update screening_responses
-- (needed for manual scoring via ScreeningViewDialog)
CREATE POLICY "HR staff can update screening responses"
ON public.screening_responses FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_capabilities WHERE user_id = auth.uid() AND capability = 'manage_recruitment')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_capabilities WHERE user_id = auth.uid() AND capability = 'manage_recruitment')
);
