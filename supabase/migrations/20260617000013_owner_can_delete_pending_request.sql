-- Allow owners to cancel (delete) their own pending requests.
-- Only pending requests can be cancelled — approved/rejected ones cannot.
CREATE POLICY "Owners can delete own pending requests"
ON public.advance_requests
FOR DELETE
TO authenticated
USING (user_id = auth.uid() AND status = 'pending');
