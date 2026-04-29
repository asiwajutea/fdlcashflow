
-- Allow admins to manage activity forms regardless of capability rows
DROP POLICY IF EXISTS "Managers manage all forms" ON public.activity_forms;
CREATE POLICY "Managers manage all forms"
ON public.activity_forms
FOR ALL
USING (public.has_role(auth.uid(), 'admin') OR public.user_has_capability(auth.uid(), 'manage_activity_forms'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.user_has_capability(auth.uid(), 'manage_activity_forms'));

-- Same for related tables
DROP POLICY IF EXISTS "Managers manage all fields" ON public.activity_form_fields;
CREATE POLICY "Managers manage all fields"
ON public.activity_form_fields
FOR ALL
USING (public.has_role(auth.uid(), 'admin') OR public.user_has_capability(auth.uid(), 'manage_activity_forms'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.user_has_capability(auth.uid(), 'manage_activity_forms'));

DROP POLICY IF EXISTS "Managers manage all assignments" ON public.activity_form_assignments;
CREATE POLICY "Managers manage all assignments"
ON public.activity_form_assignments
FOR ALL
USING (public.has_role(auth.uid(), 'admin') OR public.user_has_capability(auth.uid(), 'manage_activity_forms'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.user_has_capability(auth.uid(), 'manage_activity_forms'));

-- Ensure admins can also view all submissions
DROP POLICY IF EXISTS "Managers view all submissions" ON public.activity_form_submissions;
CREATE POLICY "Managers view all submissions"
ON public.activity_form_submissions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin') OR public.user_has_capability(auth.uid(), 'manage_activity_forms') OR user_id = auth.uid());
