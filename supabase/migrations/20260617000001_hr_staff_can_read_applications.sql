-- Grant HR staff (users with manage_recruitment capability) read/write access
-- to all HR-related tables. Previously only admins could access these.

-- Helper: check if the current user has a given capability
-- (inline subquery used instead of a function to avoid dependency issues)

-- APPLICATIONS
CREATE POLICY "HR staff can read all applications"
ON public.applications FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_capabilities WHERE user_id = auth.uid() AND capability = 'manage_recruitment')
);

CREATE POLICY "HR staff can update applications"
ON public.applications FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_capabilities WHERE user_id = auth.uid() AND capability = 'manage_recruitment')
);

-- SCREENING RESPONSES
CREATE POLICY "HR staff can read all screening responses"
ON public.screening_responses FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_capabilities WHERE user_id = auth.uid() AND capability = 'manage_recruitment')
);

CREATE POLICY "HR staff can insert screening responses"
ON public.screening_responses FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_capabilities WHERE user_id = auth.uid() AND capability = 'manage_recruitment')
);

-- INTERVIEWS
CREATE POLICY "HR staff can read all interviews"
ON public.interviews FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_capabilities WHERE user_id = auth.uid() AND capability = 'manage_recruitment')
);

CREATE POLICY "HR staff can manage interviews"
ON public.interviews FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_capabilities WHERE user_id = auth.uid() AND capability = 'schedule_interviews')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_capabilities WHERE user_id = auth.uid() AND capability = 'schedule_interviews')
);

-- CONTRACTS
CREATE POLICY "HR staff can read all contracts"
ON public.contracts FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_capabilities WHERE user_id = auth.uid() AND capability = 'manage_recruitment')
);

CREATE POLICY "HR staff can manage contracts"
ON public.contracts FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_capabilities WHERE user_id = auth.uid() AND capability = 'generate_contracts')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_capabilities WHERE user_id = auth.uid() AND capability = 'generate_contracts')
);
