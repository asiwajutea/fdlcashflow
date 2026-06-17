-- HR staff with manage_recruitment can INSERT and UPDATE contracts (needed for "offered" status)
-- and UPDATE applications (needed for all status changes including "hired").
-- The promote-candidate-to-employee edge function already uses service role,
-- so no RLS change is needed there — only the auth check in the function was blocking it.

-- Contracts: allow HR staff to insert (required when moving to "offered")
CREATE POLICY "HR staff can insert contracts"
ON public.contracts FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_capabilities WHERE user_id = auth.uid() AND capability = 'manage_recruitment')
);

-- Contracts: allow HR staff to update (required to modify contract status)
CREATE POLICY "HR staff can update contracts"  
ON public.contracts FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_capabilities WHERE user_id = auth.uid() AND capability = 'manage_recruitment')
);
