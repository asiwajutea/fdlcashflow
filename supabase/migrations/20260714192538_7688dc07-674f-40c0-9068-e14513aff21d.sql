
CREATE TABLE public.oralgen_interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  age int,
  sex text,
  phone text,
  individual_photo_url text,
  address text,
  city text,
  state text,
  gps_lat numeric,
  gps_lng numeric,
  home_photo_url text,
  path_photo_url text,
  notes text,
  status text NOT NULL DEFAULT 'pending_interview',
  interviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  interviewer_accepted_at timestamptz,
  interview_deadline timestamptz,
  interview_completed_at timestamptz,
  pdf_url text,
  zip_url text,
  field_manager_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  audit_accepted_at timestamptz,
  audit_scheduled_date timestamptz,
  audit_deadline timestamptz,
  audit_completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.oralgen_interviews TO authenticated;
GRANT ALL ON public.oralgen_interviews TO service_role;

ALTER TABLE public.oralgen_interviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "oralgen_select" ON public.oralgen_interviews
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.user_has_capability(auth.uid(), 'oralgen_admin')
  OR created_by = auth.uid()
  OR interviewer_id = auth.uid()
  OR field_manager_id = auth.uid()
  OR (status = 'pending_interview' AND public.user_has_capability(auth.uid(), 'oralgen_interview'))
  OR (status = 'awaiting_audit' AND public.user_has_capability(auth.uid(), 'oralgen_audit'))
);

CREATE POLICY "oralgen_insert" ON public.oralgen_interviews
FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid() AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.user_has_capability(auth.uid(), 'oralgen_book')
    OR public.user_has_capability(auth.uid(), 'oralgen_admin')
  )
);

CREATE POLICY "oralgen_update" ON public.oralgen_interviews
FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.user_has_capability(auth.uid(), 'oralgen_admin')
  OR interviewer_id = auth.uid()
  OR field_manager_id = auth.uid()
  OR (created_by = auth.uid() AND status = 'pending_interview')
  OR (status = 'pending_interview' AND public.user_has_capability(auth.uid(), 'oralgen_interview'))
  OR (status = 'awaiting_audit' AND public.user_has_capability(auth.uid(), 'oralgen_audit'))
);

CREATE POLICY "oralgen_delete" ON public.oralgen_interviews
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_oralgen_updated
BEFORE UPDATE ON public.oralgen_interviews
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_oralgen_status ON public.oralgen_interviews(status);
CREATE INDEX idx_oralgen_interviewer ON public.oralgen_interviews(interviewer_id);
CREATE INDEX idx_oralgen_manager ON public.oralgen_interviews(field_manager_id);

-- Storage policies on the oralgen-files bucket
CREATE POLICY "oralgen_files_read" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'oralgen-files' AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.user_has_capability(auth.uid(), 'oralgen_admin')
    OR public.user_has_capability(auth.uid(), 'oralgen_book')
    OR public.user_has_capability(auth.uid(), 'oralgen_interview')
    OR public.user_has_capability(auth.uid(), 'oralgen_audit')
  )
);

CREATE POLICY "oralgen_files_write" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'oralgen-files' AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.user_has_capability(auth.uid(), 'oralgen_admin')
    OR public.user_has_capability(auth.uid(), 'oralgen_book')
    OR public.user_has_capability(auth.uid(), 'oralgen_interview')
    OR public.user_has_capability(auth.uid(), 'oralgen_audit')
  )
);

CREATE POLICY "oralgen_files_update" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'oralgen-files' AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.user_has_capability(auth.uid(), 'oralgen_admin')
    OR owner = auth.uid()
  )
);

CREATE POLICY "oralgen_files_delete" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'oralgen-files' AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.user_has_capability(auth.uid(), 'oralgen_admin')
    OR owner = auth.uid()
  )
);
