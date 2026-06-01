
-- 1. Payslip generator missing columns
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS ytd_taxable_income NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ytd_tax_paid NUMERIC NOT NULL DEFAULT 0;

-- 2. Welcome message trigger — re-attach (the function exists; trigger was missing)
DROP TRIGGER IF EXISTS trg_send_welcome_message ON public.profiles;
CREATE TRIGGER trg_send_welcome_message
AFTER UPDATE OF approval_status ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.send_welcome_inbox_message();

-- 2b. Backfill — call the function for any approved employee/admin who never got a welcome
DO $$
DECLARE
  r RECORD;
  v_role public.app_role;
  v_sender_email text;
  v_sender_id uuid;
  v_first text;
  v_body text;
BEGIN
  SELECT value INTO v_sender_email FROM public.app_settings WHERE key='welcome_sender_email';
  IF v_sender_email IS NULL THEN v_sender_email := 'admin@footprintsdynasty.com.ng'; END IF;
  SELECT id INTO v_sender_id FROM auth.users WHERE lower(email)=lower(v_sender_email) LIMIT 1;
  IF v_sender_id IS NULL THEN
    SELECT ur.user_id INTO v_sender_id FROM public.user_roles ur WHERE ur.role='admin' LIMIT 1;
  END IF;
  IF v_sender_id IS NULL THEN RETURN; END IF;

  FOR r IN
    SELECT p.id, p.full_name FROM public.profiles p
    JOIN public.user_roles ur ON ur.user_id = p.id
    WHERE p.approval_status='approved'
      AND ur.role IN ('admin','employee')
      AND p.id <> v_sender_id
      AND NOT EXISTS (
        SELECT 1 FROM public.messages m
        WHERE m.recipient_id = p.id AND m.subject LIKE 'Welcome to Footprints%'
      )
  LOOP
    v_first := split_part(COALESCE(r.full_name,'there'),' ',1);
    IF v_first = '' THEN v_first := 'there'; END IF;
    v_body := 'Hi ' || v_first || ',' || E'\n\n' ||
      'Welcome to the Footprints Dynasty family! On behalf of the entire team, I''m thrilled to have you on board. Your account has been verified — you now have full access to the platform.' || E'\n\n' ||
      'Please take a moment to complete your profile if you have not already — add your photo, bank details, phone number and any other missing information. This helps us pay you on time and keep your records accurate.' || E'\n\n' ||
      'Explore your dashboard, payslips, activity reports and our knowledge base. If you need anything at all, just reply to this message — we''re here for you.' || E'\n\n' ||
      'Warmly,' || E'\n' || 'Temidayo Ehny Akintuyi' || E'\n' || 'PM | MD, Footprints Dynasty Ltd.';
    INSERT INTO public.messages (sender_id, recipient_id, subject, body, is_read)
    VALUES (v_sender_id, r.id, 'Welcome to Footprints Dynasty 🎉', v_body, false);
  END LOOP;
END $$;

-- 3. Profile About Me + manager intro fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS about_me text,
  ADD COLUMN IF NOT EXISTS about_me_excerpt text,
  ADD COLUMN IF NOT EXISTS about_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS about_visibility jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS manager_intro_acknowledged boolean NOT NULL DEFAULT false;

-- 4. User presence table
CREATE TABLE IF NOT EXISTS public.user_presence (
  user_id uuid PRIMARY KEY,
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.user_presence TO authenticated;
GRANT INSERT, UPDATE ON public.user_presence TO authenticated;
GRANT ALL ON public.user_presence TO service_role;

ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read presence" ON public.user_presence;
CREATE POLICY "Authenticated read presence" ON public.user_presence
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users upsert own presence ins" ON public.user_presence;
CREATE POLICY "Users upsert own presence ins" ON public.user_presence
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users upsert own presence upd" ON public.user_presence;
CREATE POLICY "Users upsert own presence upd" ON public.user_presence
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
