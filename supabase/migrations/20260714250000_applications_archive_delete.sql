-- Soft-delete (archive) support for candidate applications
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL;

-- HR staff (manage_recruitment) can now delete applications (archive/remove)
CREATE POLICY "HR staff can delete applications"
ON public.applications FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_capabilities
    WHERE user_id = auth.uid() AND capability = 'manage_recruitment'
  )
);
