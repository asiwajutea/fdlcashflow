-- ─── Allow oralgen_admin capability to delete any interview record ────────────
--
-- The original oralgen_delete policy only allowed role='admin'.
-- oralgen_admin capability holders (field coordinators, supervisors) need to
-- be able to delete records from the All Records tab.

DROP POLICY IF EXISTS "oralgen_delete"           ON public.oralgen_interviews;
DROP POLICY IF EXISTS "oralgen_delete_own_draft" ON public.oralgen_interviews;

-- Full delete: system admins + oralgen_admin capability
CREATE POLICY "oralgen_delete"
  ON public.oralgen_interviews
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.user_has_capability(auth.uid(), 'oralgen_admin')
  );

-- Booking agents can still delete their own drafts
CREATE POLICY "oralgen_delete_own_draft"
  ON public.oralgen_interviews
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    AND status = 'draft'
  );
