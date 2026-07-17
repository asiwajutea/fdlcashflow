-- Allow the 'draft' status value and let creators delete their own draft bookings
-- (The status column is plain TEXT so no enum change is needed)

-- Add delete policy: booking creator can delete their own draft records
CREATE POLICY "oralgen_delete_own_draft" ON public.oralgen_interviews
FOR DELETE TO authenticated
USING (
  created_by = auth.uid()
  AND status = 'draft'
);
