
-- 1. Allow admins to update any profile (needed for manager_id assignment)
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile" ON public.profiles
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. Fix welcome inbox trigger — fire when approval_status flips to 'approved'
DROP TRIGGER IF EXISTS trg_send_welcome_message ON public.profiles;

CREATE OR REPLACE FUNCTION public.send_welcome_inbox_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role app_role;
  v_sender_email text;
  v_sender_id uuid;
  v_first_name text;
  v_body text;
BEGIN
  -- Only fire when approval flips to approved
  IF NOT (COALESCE(OLD.approval_status,'') <> 'approved' AND NEW.approval_status = 'approved') THEN
    RETURN NEW;
  END IF;

  SELECT role INTO v_role FROM public.user_roles WHERE user_id = NEW.id LIMIT 1;
  IF v_role IS NULL OR v_role NOT IN ('employee','admin') THEN
    RETURN NEW;
  END IF;

  SELECT value INTO v_sender_email FROM public.app_settings WHERE key = 'welcome_sender_email';
  IF v_sender_email IS NULL THEN
    v_sender_email := 'admin@footprintsdynasty.com.ng';
  END IF;

  SELECT id INTO v_sender_id FROM auth.users WHERE lower(email) = lower(v_sender_email) LIMIT 1;
  IF v_sender_id IS NULL OR v_sender_id = NEW.id THEN
    RETURN NEW;
  END IF;

  -- Don't double-send
  IF EXISTS (
    SELECT 1 FROM public.messages
    WHERE recipient_id = NEW.id AND sender_id = v_sender_id
      AND subject LIKE 'Welcome to Footprints%'
  ) THEN
    RETURN NEW;
  END IF;

  v_first_name := split_part(COALESCE(NEW.full_name, 'there'), ' ', 1);
  IF v_first_name = '' THEN v_first_name := 'there'; END IF;

  v_body := 'Hi ' || v_first_name || ',' || E'\n\n' ||
    'Welcome to the Footprints Dynasty family! On behalf of the entire team, I''m thrilled to have you on board. Your account has just been verified — you now have full access to the platform.' || E'\n\n' ||
    'Please take a moment to complete your profile if you have not already — add your photo, bank details, phone number and any other missing information. This helps us pay you on time and keep your records accurate.' || E'\n\n' ||
    'Explore your dashboard, payslips, activity reports and our knowledge base. If you need anything at all, just reply to this message — we''re here for you.' || E'\n\n' ||
    'Warmly,' || E'\n' ||
    'Temidayo Ehny Akintuyi' || E'\n' ||
    'PM | MD, Footprints Dynasty Ltd.';

  INSERT INTO public.messages (sender_id, recipient_id, subject, body, is_read)
  VALUES (v_sender_id, NEW.id, 'Welcome to Footprints Dynasty 🎉', v_body, false);

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_send_welcome_message
AFTER UPDATE OF approval_status ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.send_welcome_inbox_message();

-- 3. SMS templates
CREATE TABLE IF NOT EXISTS public.sms_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  body text NOT NULL,
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sms_templates TO authenticated;
GRANT ALL ON public.sms_templates TO service_role;

ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage sms templates" ON public.sms_templates
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated read sms templates" ON public.sms_templates
FOR SELECT TO authenticated USING (true);

-- 4. SMS logs
CREATE TABLE IF NOT EXISTS public.sms_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text,
  recipient_phone text NOT NULL,
  user_id uuid,
  body text NOT NULL,
  status text NOT NULL,
  provider_msg_id text,
  units numeric,
  balance numeric,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sms_logs TO authenticated;
GRANT ALL ON public.sms_logs TO service_role;

ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read sms logs" ON public.sms_logs
FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage sms logs" ON public.sms_logs
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 5. Seed default SMS templates
INSERT INTO public.sms_templates (key, name, body, variables) VALUES
  ('account_approved', 'Account Approved',
   'Hi {{name}}, your Footprints Dynasty account has been approved. Log in at footprintsdynasty.com.ng to get started.',
   '["name"]'::jsonb),
  ('birthday', 'Birthday Wishes',
   'Happy birthday {{name}}! Wishing you a fantastic year ahead from all of us at Footprints Dynasty.',
   '["name"]'::jsonb),
  ('holiday', 'Holiday Wishes',
   'Hi {{name}}, the Footprints Dynasty family wishes you a happy {{holiday}}. Enjoy the day!',
   '["name","holiday"]'::jsonb),
  ('finance_decision', 'Finance Request Decision',
   'Hi {{name}}, your finance request of NGN {{amount}} has been {{status}}. {{note}}',
   '["name","amount","status","note"]'::jsonb),
  ('payslip_generated', 'Payslip Generated',
   'Hi {{name}}, your payslip for {{month}} {{year}} is ready. Net payment: NGN {{amount}}. View it on your dashboard.',
   '["name","month","year","amount"]'::jsonb),
  ('candidate_stage', 'Application Update',
   'Hi {{name}}, good news — your application for {{job}} has moved to the {{stage}} stage. Check your dashboard for next steps.',
   '["name","job","stage"]'::jsonb),
  ('candidate_hire', 'You Are Hired',
   'Congratulations {{name}}! You have been hired as {{position}} at Footprints Dynasty. Welcome aboard!',
   '["name","position"]'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 6. Holidays settings
INSERT INTO public.app_settings (key, value) VALUES
  ('welcome_sender_email', 'admin@footprintsdynasty.com.ng'),
  ('holidays', '[]')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value WHERE app_settings.value IS NULL OR app_settings.value = '';

-- update timestamp trigger for sms_templates
CREATE TRIGGER trg_sms_templates_updated
BEFORE UPDATE ON public.sms_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
