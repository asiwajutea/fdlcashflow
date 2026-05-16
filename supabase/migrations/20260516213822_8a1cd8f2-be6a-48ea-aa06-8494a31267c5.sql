CREATE TABLE public.advance_request_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.advance_requests(id) ON DELETE CASCADE,
  actor_id uuid,
  event_type text NOT NULL CHECK (event_type IN ('submitted','approved','rejected','note_added','repaid')),
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_advance_request_events_request_id ON public.advance_request_events(request_id);

ALTER TABLE public.advance_request_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners and approvers read events"
  ON public.advance_request_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.advance_requests a
      WHERE a.id = advance_request_events.request_id
        AND (
          a.user_id = auth.uid()
          OR has_role(auth.uid(),'admin'::app_role)
          OR user_has_capability(auth.uid(),'approve_finance_requests')
          OR a.user_id IN (SELECT user_id FROM public.get_subordinate_user_ids(auth.uid()))
        )
    )
  );

CREATE POLICY "Owners and approvers insert events"
  ON public.advance_request_events FOR INSERT
  TO authenticated
  WITH CHECK (
    actor_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.advance_requests a
      WHERE a.id = advance_request_events.request_id
        AND (
          a.user_id = auth.uid()
          OR has_role(auth.uid(),'admin'::app_role)
          OR user_has_capability(auth.uid(),'approve_finance_requests')
        )
    )
  );

-- Backfill from existing requests
INSERT INTO public.advance_request_events (request_id, actor_id, event_type, note, created_at)
SELECT id, user_id, 'submitted', '', created_at FROM public.advance_requests;

INSERT INTO public.advance_request_events (request_id, actor_id, event_type, note, created_at)
SELECT id, approver_id, status, COALESCE(approver_note,''), COALESCE(decided_at, now())
FROM public.advance_requests
WHERE status IN ('approved','rejected') AND decided_at IS NOT NULL;