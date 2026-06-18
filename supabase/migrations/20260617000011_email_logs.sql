-- Email logs table: tracks every email sent through the send-email edge function
CREATE TABLE public.email_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key   TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_name  TEXT,
  user_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subject        TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'skipped')),
  resend_id      TEXT,
  error          TEXT,
  vars           JSONB DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read email logs"
ON public.email_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "HR staff can read email logs"
ON public.email_logs FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_capabilities WHERE user_id = auth.uid() AND capability = 'manage_recruitment')
);

CREATE POLICY "Service role can insert email logs"
ON public.email_logs FOR INSERT TO authenticated
WITH CHECK (true);

CREATE INDEX idx_email_logs_created ON public.email_logs(created_at DESC);
CREATE INDEX idx_email_logs_template ON public.email_logs(template_key);
CREATE INDEX idx_email_logs_status ON public.email_logs(status);
