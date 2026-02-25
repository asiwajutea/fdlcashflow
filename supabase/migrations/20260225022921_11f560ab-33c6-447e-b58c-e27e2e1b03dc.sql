
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'employee', 'guest', 'candidate');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  passcode TEXT DEFAULT '00000000',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'employee',
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- User capabilities table
CREATE TABLE public.user_capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  capability TEXT NOT NULL,
  UNIQUE(user_id, capability)
);
ALTER TABLE public.user_capabilities ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Get user role function
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Rate configurations
CREATE TABLE public.rate_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_work_rate NUMERIC NOT NULL DEFAULT 90,
  data_entry_rate NUMERIC NOT NULL DEFAULT 15,
  bac_audit_rate NUMERIC NOT NULL DEFAULT 5,
  metadata_audit_rate NUMERIC NOT NULL DEFAULT 5,
  virtual_audit_rate NUMERIC NOT NULL DEFAULT 5,
  booklet_monthly_income NUMERIC NOT NULL DEFAULT 65000,
  field_agent_rate NUMERIC NOT NULL DEFAULT 0,
  field_manager_rate NUMERIC NOT NULL DEFAULT 0,
  booking_agent_rate NUMERIC NOT NULL DEFAULT 0,
  field_relation_rate NUMERIC NOT NULL DEFAULT 0,
  field_misc_rate NUMERIC NOT NULL DEFAULT 0,
  data_entry_clerks_rate NUMERIC NOT NULL DEFAULT 0,
  qa_manager_rate NUMERIC NOT NULL DEFAULT 0,
  data_entry_misc_rate NUMERIC NOT NULL DEFAULT 0,
  pm_field_work_rate NUMERIC NOT NULL DEFAULT 0,
  pm_data_entry_rate NUMERIC NOT NULL DEFAULT 0,
  pm_bac_audit_rate NUMERIC NOT NULL DEFAULT 0,
  field_relation_supervisor_salary NUMERIC NOT NULL DEFAULT 0,
  administrative_assistant_salary NUMERIC NOT NULL DEFAULT 0,
  field_relation_officers_salary NUMERIC NOT NULL DEFAULT 0,
  power_plant_monthly NUMERIC NOT NULL DEFAULT 0,
  office_data_subscription_monthly NUMERIC NOT NULL DEFAULT 0,
  staff_data_support_monthly NUMERIC NOT NULL DEFAULT 0,
  employee_gratuity_rate NUMERIC NOT NULL DEFAULT 0,
  logistics_rate NUMERIC NOT NULL DEFAULT 0.03,
  incentives_rate NUMERIC NOT NULL DEFAULT 0.02,
  effective_from TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.rate_configurations ENABLE ROW LEVEL SECURITY;

-- Weekly records
CREATE TABLE public.weekly_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  field_work NUMERIC NOT NULL DEFAULT 0,
  data_entry NUMERIC NOT NULL DEFAULT 0,
  bac_audit NUMERIC NOT NULL DEFAULT 0,
  metadata_audit NUMERIC NOT NULL DEFAULT 0,
  virtual_audit NUMERIC NOT NULL DEFAULT 0,
  booklet_income NUMERIC NOT NULL DEFAULT 0,
  total_income NUMERIC NOT NULL DEFAULT 0,
  total_expenses NUMERIC NOT NULL DEFAULT 0,
  net_cashflow NUMERIC NOT NULL DEFAULT 0,
  other_expenses JSONB DEFAULT '[]',
  rate_config_id UUID REFERENCES public.rate_configurations(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.weekly_records ENABLE ROW LEVEL SECURITY;

-- Rate change history
CREATE TABLE public.rate_change_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_config_id UUID REFERENCES public.rate_configurations(id),
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  changes JSONB DEFAULT '{}'
);
ALTER TABLE public.rate_change_history ENABLE ROW LEVEL SECURITY;

-- Daily transactions
CREATE TABLE public.daily_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT NOT NULL DEFAULT 'income',
  category TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  amount NUMERIC NOT NULL DEFAULT 0,
  reference_id UUID,
  reference_type TEXT,
  is_auto_generated BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.daily_transactions ENABLE ROW LEVEL SECURITY;

-- Company settings
CREATE TABLE public.company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL DEFAULT '',
  company_address TEXT NOT NULL DEFAULT '',
  company_phone TEXT NOT NULL DEFAULT '',
  company_email TEXT NOT NULL DEFAULT '',
  logo_url TEXT DEFAULT '',
  invoice_footer TEXT DEFAULT '',
  social_facebook TEXT DEFAULT '',
  social_twitter TEXT DEFAULT '',
  social_instagram TEXT DEFAULT '',
  social_linkedin TEXT DEFAULT '',
  social_youtube TEXT DEFAULT '',
  social_tiktok TEXT DEFAULT '',
  social_website TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Job positions
CREATE TABLE public.job_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  department TEXT DEFAULT '',
  description TEXT DEFAULT '',
  requirements TEXT DEFAULT '',
  key_responsibilities TEXT DEFAULT '',
  job_type TEXT DEFAULT '',
  compensation TEXT DEFAULT '',
  work_location_country TEXT DEFAULT '',
  work_location_state TEXT DEFAULT '',
  media_url TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.job_positions ENABLE ROW LEVEL SECURITY;

-- Candidates
CREATE TABLE public.candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT,
  education TEXT,
  experience_summary TEXT,
  resume_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

-- Applications
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.job_positions(id) ON DELETE CASCADE,
  cover_letter TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Screening responses
CREATE TABLE public.screening_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  responses JSONB DEFAULT '{}',
  score NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.screening_responses ENABLE ROW LEVEL SECURITY;

-- Interviews
CREATE TABLE public.interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  interview_date TIMESTAMPTZ,
  meeting_link TEXT DEFAULT '',
  interviewer TEXT DEFAULT '',
  score NUMERIC,
  feedback TEXT DEFAULT '',
  outcome TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;

-- Contracts
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  contract_url TEXT DEFAULT '',
  signed_at TIMESTAMPTZ,
  signature_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- Messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  parent_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- ============ RLS POLICIES ============

-- Profiles: users can read/update own, admins can read all
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- User roles: admins can manage, users can read own
CREATE POLICY "Users can read own role" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- User capabilities
CREATE POLICY "Users can read own capabilities" ON public.user_capabilities FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage capabilities" ON public.user_capabilities FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Rate configurations: authenticated can read, admins can manage
CREATE POLICY "Authenticated can read rates" ON public.rate_configurations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage rates" ON public.rate_configurations FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Weekly records: users see own, admins see all
CREATE POLICY "Users can read own records" ON public.weekly_records FOR SELECT TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can insert records" ON public.weekly_records FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Admins can manage records" ON public.weekly_records FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Rate change history
CREATE POLICY "Authenticated can read rate history" ON public.rate_change_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert rate history" ON public.rate_change_history FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Daily transactions: users see own, admins see all
CREATE POLICY "Users can read own transactions" ON public.daily_transactions FOR SELECT TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can insert transactions" ON public.daily_transactions FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Admins can manage transactions" ON public.daily_transactions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Company settings: all authenticated can read, admins can manage
CREATE POLICY "Authenticated can read company settings" ON public.company_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage company settings" ON public.company_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
-- Allow anon to read company settings for public pages
CREATE POLICY "Anon can read company settings" ON public.company_settings FOR SELECT TO anon USING (true);

-- Job positions: all can read open, admins manage
CREATE POLICY "Anyone can read open jobs" ON public.job_positions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage jobs" ON public.job_positions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Candidates: users see own, admins see all
CREATE POLICY "Users can read own candidate" ON public.candidates FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert own candidate" ON public.candidates FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own candidate" ON public.candidates FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage candidates" ON public.candidates FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Applications: candidates see own, admins see all
CREATE POLICY "Candidates can read own apps" ON public.applications FOR SELECT TO authenticated USING (
  candidate_id IN (SELECT id FROM public.candidates WHERE user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Candidates can insert apps" ON public.applications FOR INSERT TO authenticated WITH CHECK (
  candidate_id IN (SELECT id FROM public.candidates WHERE user_id = auth.uid())
);
CREATE POLICY "Admins can manage apps" ON public.applications FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Screening responses
CREATE POLICY "Admins can manage screening" ON public.screening_responses FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Candidates can read own screening" ON public.screening_responses FOR SELECT TO authenticated USING (
  application_id IN (SELECT id FROM public.applications WHERE candidate_id IN (SELECT id FROM public.candidates WHERE user_id = auth.uid()))
);
CREATE POLICY "Candidates can update own screening" ON public.screening_responses FOR UPDATE TO authenticated USING (
  application_id IN (SELECT id FROM public.applications WHERE candidate_id IN (SELECT id FROM public.candidates WHERE user_id = auth.uid()))
);

-- Interviews
CREATE POLICY "Admins can manage interviews" ON public.interviews FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Candidates can read own interviews" ON public.interviews FOR SELECT TO authenticated USING (
  application_id IN (SELECT id FROM public.applications WHERE candidate_id IN (SELECT id FROM public.candidates WHERE user_id = auth.uid()))
);

-- Contracts
CREATE POLICY "Admins can manage contracts" ON public.contracts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Candidates can read own contracts" ON public.contracts FOR SELECT TO authenticated USING (
  application_id IN (SELECT id FROM public.applications WHERE candidate_id IN (SELECT id FROM public.candidates WHERE user_id = auth.uid()))
);
CREATE POLICY "Candidates can update own contracts" ON public.contracts FOR UPDATE TO authenticated USING (
  application_id IN (SELECT id FROM public.applications WHERE candidate_id IN (SELECT id FROM public.candidates WHERE user_id = auth.uid()))
);

-- Messages: users can read/send own messages, admins can see all
CREATE POLICY "Users can read own messages" ON public.messages FOR SELECT TO authenticated USING (
  sender_id = auth.uid() OR recipient_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
);
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());
CREATE POLICY "Users can update own received messages" ON public.messages FOR UPDATE TO authenticated USING (recipient_id = auth.uid());

-- Storage policies for resumes
CREATE POLICY "Users can upload resumes" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'resumes');
CREATE POLICY "Anyone can read resumes" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'resumes');

-- Storage policies for avatars
CREATE POLICY "Users can upload avatars" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "Users can update own avatars" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars');
CREATE POLICY "Anyone can read avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, passcode)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'passcode', '00000000')
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'employee')
  );
  
  -- Auto-assign capabilities based on role
  IF (NEW.raw_user_meta_data->>'role') = 'candidate' THEN
    INSERT INTO public.user_capabilities (user_id, capability) VALUES
      (NEW.id, 'submit_application'),
      (NEW.id, 'complete_screening'),
      (NEW.id, 'view_interview'),
      (NEW.id, 'sign_contract'),
      (NEW.id, 'view_inbox'),
      (NEW.id, 'send_messages');
  ELSIF (NEW.raw_user_meta_data->>'role') = 'admin' THEN
    -- Admins get all capabilities (but they also bypass checks)
    NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
