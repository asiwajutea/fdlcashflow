
-- 1. Add candidate role to enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'candidate';

-- 2. job_positions table
CREATE TABLE public.job_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  department TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  requirements TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.job_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view open jobs" ON public.job_positions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert job positions" ON public.job_positions
  FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update job positions" ON public.job_positions
  FOR UPDATE TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete job positions" ON public.job_positions
  FOR DELETE TO authenticated USING (is_admin(auth.uid()));

CREATE TRIGGER update_job_positions_updated_at
  BEFORE UPDATE ON public.job_positions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. candidates table
CREATE TABLE public.candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  phone TEXT,
  address TEXT,
  education TEXT,
  experience_summary TEXT,
  resume_url TEXT,
  current_status TEXT NOT NULL DEFAULT 'applied',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all candidates" ON public.candidates
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Candidates can view own record" ON public.candidates
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Candidates can insert own record" ON public.candidates
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Candidates can update own record" ON public.candidates
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can insert candidates" ON public.candidates
  FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update candidates" ON public.candidates
  FOR UPDATE TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete candidates" ON public.candidates
  FOR DELETE TO authenticated USING (is_admin(auth.uid()));

CREATE TRIGGER update_candidates_updated_at
  BEFORE UPDATE ON public.candidates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. applications table
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.job_positions(id) ON DELETE CASCADE,
  cover_letter TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all applications" ON public.applications
  FOR SELECT TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Candidates can view own applications" ON public.applications
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.candidates WHERE candidates.id = applications.candidate_id AND candidates.user_id = auth.uid())
  );

CREATE POLICY "Candidates can insert own applications" ON public.applications
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.candidates WHERE candidates.id = candidate_id AND candidates.user_id = auth.uid())
  );

CREATE POLICY "Admins can update applications" ON public.applications
  FOR UPDATE TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete applications" ON public.applications
  FOR DELETE TO authenticated USING (is_admin(auth.uid()));

CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. screening_responses table
CREATE TABLE public.screening_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  responses JSONB DEFAULT '[]'::jsonb,
  score NUMERIC,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.screening_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage screening responses" ON public.screening_responses
  FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Candidates can view own screening responses" ON public.screening_responses
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.candidates c ON c.id = a.candidate_id
      WHERE a.id = screening_responses.application_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Candidates can insert own screening responses" ON public.screening_responses
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.candidates c ON c.id = a.candidate_id
      WHERE a.id = application_id AND c.user_id = auth.uid()
    )
  );

-- 6. interviews table
CREATE TABLE public.interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  interview_date TIMESTAMPTZ,
  meeting_link TEXT,
  interviewer TEXT,
  score NUMERIC,
  feedback TEXT,
  outcome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage interviews" ON public.interviews
  FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Candidates can view own interviews" ON public.interviews
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.candidates c ON c.id = a.candidate_id
      WHERE a.id = interviews.application_id AND c.user_id = auth.uid()
    )
  );

CREATE TRIGGER update_interviews_updated_at
  BEFORE UPDATE ON public.interviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. contracts table
CREATE TABLE public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  contract_url TEXT,
  signature_data TEXT,
  signed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage contracts" ON public.contracts
  FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Candidates can view own contracts" ON public.contracts
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.candidates c ON c.id = a.candidate_id
      WHERE a.id = contracts.application_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Candidates can update own contracts for signing" ON public.contracts
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.candidates c ON c.id = a.candidate_id
      WHERE a.id = contracts.application_id AND c.user_id = auth.uid()
    )
  );

CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('contracts', 'contracts', false);

-- Resume storage policies
CREATE POLICY "Users can upload own resumes" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own resumes" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'resumes' AND (auth.uid()::text = (storage.foldername(name))[1] OR is_admin(auth.uid())));

CREATE POLICY "Users can update own resumes" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own resumes" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Contract storage policies
CREATE POLICY "Admins can upload contracts" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'contracts' AND is_admin(auth.uid()));

CREATE POLICY "Users can view own contracts" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'contracts' AND (auth.uid()::text = (storage.foldername(name))[1] OR is_admin(auth.uid())));

CREATE POLICY "Admins can update contracts" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'contracts' AND is_admin(auth.uid()));

CREATE POLICY "Admins can delete contracts" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'contracts' AND is_admin(auth.uid()));
