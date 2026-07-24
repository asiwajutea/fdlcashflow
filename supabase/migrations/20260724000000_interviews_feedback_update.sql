-- Allow HR with manage_recruitment capability to update interview outcome/feedback
-- (Previously only schedule_interviews capability could update interviews)
DROP POLICY IF EXISTS "HR manage_recruitment can update interviews" ON public.interviews;
CREATE POLICY "HR manage_recruitment can update interviews"
ON public.interviews FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_capabilities
    WHERE user_id = auth.uid() AND capability = 'manage_recruitment'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_capabilities
    WHERE user_id = auth.uid() AND capability = 'manage_recruitment'
  )
);
