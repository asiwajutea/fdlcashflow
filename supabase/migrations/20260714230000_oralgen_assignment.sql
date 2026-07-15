-- Track who assigned an interview to a field agent
ALTER TABLE public.oralgen_interviews
  ADD COLUMN IF NOT EXISTS assigned_by UUID DEFAULT NULL,  -- manager/admin who made the assignment
  ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ DEFAULT NULL;

-- Allow field managers and coordinators to assign interviewers:
-- They already have UPDATE permission via oralgen_update policy.
-- Add a capability that coordinators will use.
-- (oralgen_admin and oralgen_audit already have update access via existing RLS)

-- Extend the update policy to allow users with oralgen_assign capability
DROP POLICY IF EXISTS "oralgen_update" ON public.oralgen_interviews;
CREATE POLICY "oralgen_update" ON public.oralgen_interviews
FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.user_has_capability(auth.uid(), 'oralgen_admin')
  OR public.user_has_capability(auth.uid(), 'oralgen_assign')
  OR interviewer_id = auth.uid()
  OR field_manager_id = auth.uid()
  OR (created_by = auth.uid() AND status = 'pending_interview')
  OR (status = 'pending_interview' AND public.user_has_capability(auth.uid(), 'oralgen_interview'))
  OR (status = 'awaiting_audit' AND public.user_has_capability(auth.uid(), 'oralgen_audit'))
);
