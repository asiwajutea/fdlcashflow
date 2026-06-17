-- HR staff need to read profiles to resolve candidate names on the Applications page.
CREATE POLICY "HR staff can read all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_capabilities WHERE user_id = auth.uid() AND capability = 'manage_recruitment')
);
