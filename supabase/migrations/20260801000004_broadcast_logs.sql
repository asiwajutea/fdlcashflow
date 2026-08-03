-- ─── Broadcast email log ─────────────────────────────────────────────────────
-- Tracks every bulk broadcast sent through the Broadcast Email page.
-- Individual recipient send results are still recorded in email_logs.

CREATE TABLE public.broadcast_logs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  subject         text        NOT NULL,
  -- Audience descriptor stored as JSONB for flexibility
  -- e.g. {"type":"role","value":"employee"} or {"type":"capability","value":"manage_recruitment"}
  -- or {"type":"all"} or {"type":"custom","user_ids":["..."]}
  audience        jsonb       NOT NULL DEFAULT '{}',
  recipient_count integer     NOT NULL DEFAULT 0,
  sent_count      integer     NOT NULL DEFAULT 0,
  failed_count    integer     NOT NULL DEFAULT 0,
  status          text        NOT NULL DEFAULT 'sending'
                              CHECK (status IN ('sending','completed','partial','failed')),
  sent_by         uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz
);

ALTER TABLE public.broadcast_logs ENABLE ROW LEVEL SECURITY;

-- Only admins and users with send_broadcast capability can read/write
CREATE POLICY "Admins can manage broadcast logs"
  ON public.broadcast_logs FOR ALL TO authenticated
  USING  (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Broadcast senders can read logs"
  ON public.broadcast_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_capabilities
      WHERE user_id = auth.uid() AND capability = 'send_broadcast'
    )
  );

CREATE INDEX idx_broadcast_logs_created ON public.broadcast_logs(created_at DESC);
CREATE INDEX idx_broadcast_logs_sent_by ON public.broadcast_logs(sent_by);
