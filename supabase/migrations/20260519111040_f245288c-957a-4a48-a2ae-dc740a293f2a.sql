
-- 1. Employee ID generator (FDL-YYYYMM-NNN)
CREATE OR REPLACE FUNCTION public.generate_employee_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix text := 'FDL-' || to_char(now(), 'YYYYMM') || '-';
  v_count int;
BEGIN
  SELECT COUNT(*) + 1 INTO v_count
  FROM public.employees
  WHERE employee_id LIKE v_prefix || '%';
  RETURN v_prefix || lpad(v_count::text, 3, '0');
END;
$$;

-- 2. Replace handle_new_user to use new ID format when no employee_id provided
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_status text;
  v_emp_id text;
  v_full_name text;
  v_designation text;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'employee');
  IF v_role IN ('candidate', 'admin') THEN
    v_status := 'approved';
  ELSE
    v_status := 'pending';
  END IF;

  INSERT INTO public.profiles (
    id, full_name, passcode, approval_status,
    birthday, gender, employee_id, phone, employment_start_date,
    position_id, department_id, project_id, team_id,
    passcode_acknowledged
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'passcode', '00000000'),
    v_status,
    NULLIF(NEW.raw_user_meta_data->>'birthday', '')::date,
    NEW.raw_user_meta_data->>'gender',
    NEW.raw_user_meta_data->>'employee_id',
    NEW.raw_user_meta_data->>'phone',
    NULLIF(NEW.raw_user_meta_data->>'employment_start_date', '')::date,
    NULLIF(NEW.raw_user_meta_data->>'position_id', '')::uuid,
    NULLIF(NEW.raw_user_meta_data->>'department_id', '')::uuid,
    NULLIF(NEW.raw_user_meta_data->>'project_id', '')::uuid,
    NULLIF(NEW.raw_user_meta_data->>'team_id', '')::uuid,
    CASE WHEN v_role = 'candidate' THEN true ELSE false END
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'employee'));

  IF v_role = 'candidate' THEN
    INSERT INTO public.user_capabilities (user_id, capability) VALUES
      (NEW.id, 'submit_application'),
      (NEW.id, 'complete_screening'),
      (NEW.id, 'view_interview'),
      (NEW.id, 'sign_contract'),
      (NEW.id, 'view_inbox'),
      (NEW.id, 'send_messages');
  END IF;

  IF v_role IN ('employee', 'admin') THEN
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
    v_emp_id := NULLIF(NEW.raw_user_meta_data->>'employee_id', '');
    IF v_emp_id IS NULL THEN
      v_emp_id := public.generate_employee_id();
    END IF;
    SELECT name INTO v_designation FROM public.positions WHERE id = NULLIF(NEW.raw_user_meta_data->>'position_id', '')::uuid;

    UPDATE public.employees
      SET user_id = NEW.id, profile_id = NEW.id
      WHERE user_id IS NULL AND lower(coalesce(email,'')) = lower(coalesce(NEW.email,''));

    IF NOT EXISTS (SELECT 1 FROM public.employees WHERE user_id = NEW.id) THEN
      INSERT INTO public.employees (employee_id, full_name, designation, email, user_id, profile_id)
      VALUES (v_emp_id, v_full_name, COALESCE(v_designation, ''), NEW.email, NEW.id, NEW.id);
    END IF;

    -- update profile employee_id if it was blank
    UPDATE public.profiles SET employee_id = v_emp_id WHERE id = NEW.id AND (employee_id IS NULL OR employee_id = '');
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure the on_auth_user_created trigger is attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Blog comments
CREATE TABLE IF NOT EXISTS public.blog_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  user_id uuid,
  author_name text NOT NULL DEFAULT 'Anonymous',
  author_email text,
  body text NOT NULL,
  is_approved boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_blog_comments_post ON public.blog_comments(post_id, created_at DESC);

ALTER TABLE public.blog_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone read approved comments" ON public.blog_comments;
CREATE POLICY "Anyone read approved comments"
  ON public.blog_comments FOR SELECT
  USING (is_approved = true);

DROP POLICY IF EXISTS "Anyone can insert comments" ON public.blog_comments;
CREATE POLICY "Anyone can insert comments"
  ON public.blog_comments FOR INSERT
  WITH CHECK (length(trim(body)) > 0);

DROP POLICY IF EXISTS "Admins manage comments" ON public.blog_comments;
CREATE POLICY "Admins manage comments"
  ON public.blog_comments FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

ALTER PUBLICATION supabase_realtime ADD TABLE public.blog_comments;

-- 4. App settings table (for things like welcome sender user id)
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated read settings" ON public.app_settings;
CREATE POLICY "Authenticated read settings" ON public.app_settings FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Admins write settings" ON public.app_settings;
CREATE POLICY "Admins write settings" ON public.app_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed welcome sender email (the actual user id is resolved at runtime)
INSERT INTO public.app_settings(key, value) VALUES ('welcome_sender_email', 'temidayo@footprintsdynasty.com')
ON CONFLICT (key) DO NOTHING;

-- 5. Welcome message trigger for new employees
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
  SELECT role INTO v_role FROM public.user_roles WHERE user_id = NEW.id LIMIT 1;
  IF v_role IS NULL OR v_role NOT IN ('employee','admin') THEN
    RETURN NEW;
  END IF;

  SELECT value INTO v_sender_email FROM public.app_settings WHERE key = 'welcome_sender_email';
  IF v_sender_email IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_sender_id FROM auth.users WHERE lower(email) = lower(v_sender_email) LIMIT 1;
  IF v_sender_id IS NULL OR v_sender_id = NEW.id THEN
    RETURN NEW;
  END IF;

  v_first_name := split_part(COALESCE(NEW.full_name, 'there'), ' ', 1);
  IF v_first_name = '' THEN v_first_name := 'there'; END IF;

  v_body := 'Hi ' || v_first_name || ',' || E'\n\n' ||
    'Welcome to the Footprints Dynasty family! On behalf of the entire team, I''m thrilled to have you on board.' || E'\n\n' ||
    'Your account is currently pending verification by our admin team — this usually happens within one business day. In the meantime, please take a moment to complete your profile so we can finish setting things up for you. Add your photo, bank details, contact info and anything else still missing.' || E'\n\n' ||
    'Once you''re verified, you''ll get full access to your dashboard, payslips, activity reports and our knowledge base.' || E'\n\n' ||
    'If you need anything at all, just reply to this message. We''re here for you.' || E'\n\n' ||
    'Warmly,' || E'\n' ||
    'Temidayo Ehny Akintuyi' || E'\n' ||
    'PM | MD, Footprints Dynasty Ltd.';

  INSERT INTO public.messages (sender_id, recipient_id, subject, body, is_read)
  VALUES (v_sender_id, NEW.id, 'Welcome to Footprints Dynasty 🎉', v_body, false);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_send_welcome_message ON public.profiles;
CREATE TRIGGER trg_send_welcome_message
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.send_welcome_inbox_message();

-- 6. Relax message insert policy so service/trigger can also insert (already SECURITY DEFINER so fine).
-- Done.
