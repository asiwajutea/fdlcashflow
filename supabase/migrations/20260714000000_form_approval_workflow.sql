-- ──────────────────────────────────────────────────────────────────────────────
-- Form Approval Workflow + "Anytime" frequency
-- ──────────────────────────────────────────────────────────────────────────────

-- 1. Approval configuration on the form itself
ALTER TABLE public.activity_forms
  ADD COLUMN IF NOT EXISTS requires_approval   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_type       TEXT    DEFAULT 'leader', -- leader | capability | specific_user
  ADD COLUMN IF NOT EXISTS approval_capability TEXT    DEFAULT NULL,     -- e.g. 'manage_activity_forms'
  ADD COLUMN IF NOT EXISTS approval_user_id    UUID    DEFAULT NULL;     -- specific approver

-- 2. Approval state on each submission
ALTER TABLE public.activity_form_submissions
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'not_required',
  -- not_required | pending | approved | rejected
  ADD COLUMN IF NOT EXISTS approver_id     UUID        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS approver_note   TEXT        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS decided_at      TIMESTAMPTZ DEFAULT NULL;

-- 3. Submission event log (mirrors advance_request_events pattern)
CREATE TABLE IF NOT EXISTS public.activity_form_submission_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.activity_form_submissions(id) ON DELETE CASCADE,
  actor_id      UUID NOT NULL,
  event_type    TEXT NOT NULL, -- submitted | approved | rejected | note_added
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_afse_submission
  ON public.activity_form_submission_events(submission_id, created_at DESC);

ALTER TABLE public.activity_form_submission_events ENABLE ROW LEVEL SECURITY;

-- Submitter can read events for their own submissions
CREATE POLICY "Users view events for own submissions"
  ON public.activity_form_submission_events FOR SELECT TO authenticated
  USING (
    submission_id IN (
      SELECT id FROM public.activity_form_submissions WHERE user_id = auth.uid()
    )
  );

-- Form managers see all
CREATE POLICY "Managers view all submission events"
  ON public.activity_form_submission_events FOR SELECT TO authenticated
  USING (public.user_has_capability(auth.uid(), 'manage_activity_forms'));

-- Leaders see their downlines
CREATE POLICY "Leaders view subordinate submission events"
  ON public.activity_form_submission_events FOR SELECT TO authenticated
  USING (
    submission_id IN (
      SELECT afs.id FROM public.activity_form_submissions afs
      WHERE public.user_can_view_form_submissions(auth.uid(), afs.form_id)
        AND afs.user_id IN (SELECT public.get_subordinate_user_ids(auth.uid()))
    )
  );

-- Only the actor can insert their own event
CREATE POLICY "Actors insert submission events"
  ON public.activity_form_submission_events FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

GRANT SELECT, INSERT ON public.activity_form_submission_events TO authenticated;
GRANT ALL               ON public.activity_form_submission_events TO service_role;

-- 4. Allow approvers to update the approval fields on submissions
--    (regular submitters can only update their own answers — existing policy covers that)
CREATE POLICY "Approvers update submission approval status"
  ON public.activity_form_submissions FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR user_has_capability(auth.uid(), 'manage_activity_forms')
    OR user_can_view_form_submissions(auth.uid(), form_id)
  )
  WITH CHECK (true);

-- 5. Seed SMS template for approval decisions
--    Template key: form_submission_decision
--    Variables: name, form, status, note
INSERT INTO public.sms_templates (key, name, body, variables, is_active)
VALUES (
  'form_submission_decision',
  'Form Submission Decision',
  'Hi {{name}}, your submission for "{{form}}" has been {{status}}.{{note}}',
  '["name","form","status","note"]'::jsonb,
  true
)
ON CONFLICT (key) DO UPDATE SET
  name      = EXCLUDED.name,
  body      = EXCLUDED.body,
  variables = EXCLUDED.variables,
  is_active = EXCLUDED.is_active;

-- 6. Seed SMS template for notifying approvers of a pending submission
--    Template key: form_submission_pending
--    Variables: name, form, submitter, link
INSERT INTO public.sms_templates (key, name, body, variables, is_active)
VALUES (
  'form_submission_pending',
  'Form Approval Request',
  'Hi {{name}}, {{submitter}} submitted "{{form}}" and it needs your approval. Review at: {{link}}',
  '["name","form","submitter","link"]'::jsonb,
  true
)
ON CONFLICT (key) DO UPDATE SET
  name      = EXCLUDED.name,
  body      = EXCLUDED.body,
  variables = EXCLUDED.variables,
  is_active = EXCLUDED.is_active;
