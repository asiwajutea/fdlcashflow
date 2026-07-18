
-- Helper: check if user is HR (admin or recruitment)
CREATE OR REPLACE FUNCTION public.is_hr(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin'::app_role)
      OR public.user_has_capability(_user_id, 'manage_recruitment');
$$;

-- ============ application_notes ============
CREATE TABLE public.application_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_notes TO authenticated;
GRANT ALL ON public.application_notes TO service_role;
ALTER TABLE public.application_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "HR can view all notes" ON public.application_notes FOR SELECT
  TO authenticated USING (public.is_hr(auth.uid()));
CREATE POLICY "HR can insert own note" ON public.application_notes FOR INSERT
  TO authenticated WITH CHECK (public.is_hr(auth.uid()) AND author_id = auth.uid());
CREATE POLICY "HR can update own note" ON public.application_notes FOR UPDATE
  TO authenticated USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY "HR can delete own note or admin" ON public.application_notes FOR DELETE
  TO authenticated USING (author_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_application_notes_updated_at BEFORE UPDATE ON public.application_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ screening_hr_scores ============
CREATE TABLE public.screening_hr_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  hr_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  score numeric,
  feedback text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(application_id, hr_user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.screening_hr_scores TO authenticated;
GRANT ALL ON public.screening_hr_scores TO service_role;
ALTER TABLE public.screening_hr_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "HR see own screening score, admin all" ON public.screening_hr_scores FOR SELECT
  TO authenticated USING (hr_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "HR insert own screening score" ON public.screening_hr_scores FOR INSERT
  TO authenticated WITH CHECK (public.is_hr(auth.uid()) AND hr_user_id = auth.uid());
CREATE POLICY "HR update own screening score" ON public.screening_hr_scores FOR UPDATE
  TO authenticated USING (hr_user_id = auth.uid()) WITH CHECK (hr_user_id = auth.uid());
CREATE POLICY "HR delete own screening score" ON public.screening_hr_scores FOR DELETE
  TO authenticated USING (hr_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_screening_hr_scores_updated_at BEFORE UPDATE ON public.screening_hr_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Recompute average screening score into screening_responses.score
CREATE OR REPLACE FUNCTION public.recompute_screening_avg()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_app uuid; v_avg numeric;
BEGIN
  v_app := COALESCE(NEW.application_id, OLD.application_id);
  SELECT AVG(score) INTO v_avg FROM public.screening_hr_scores
    WHERE application_id = v_app AND score IS NOT NULL;
  UPDATE public.screening_responses SET score = ROUND(v_avg)::int
    WHERE application_id = v_app;
  RETURN NULL;
END; $$;
CREATE TRIGGER trg_recompute_screening_avg
  AFTER INSERT OR UPDATE OR DELETE ON public.screening_hr_scores
  FOR EACH ROW EXECUTE FUNCTION public.recompute_screening_avg();

-- ============ interview_hr_scores ============
CREATE TABLE public.interview_hr_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id uuid NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  hr_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score numeric,
  feedback text,
  outcome text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(interview_id, hr_user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_hr_scores TO authenticated;
GRANT ALL ON public.interview_hr_scores TO service_role;
ALTER TABLE public.interview_hr_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "HR see own interview score, admin all" ON public.interview_hr_scores FOR SELECT
  TO authenticated USING (hr_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "HR insert own interview score" ON public.interview_hr_scores FOR INSERT
  TO authenticated WITH CHECK (public.is_hr(auth.uid()) AND hr_user_id = auth.uid());
CREATE POLICY "HR update own interview score" ON public.interview_hr_scores FOR UPDATE
  TO authenticated USING (hr_user_id = auth.uid()) WITH CHECK (hr_user_id = auth.uid());
CREATE POLICY "HR delete own interview score" ON public.interview_hr_scores FOR DELETE
  TO authenticated USING (hr_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_interview_hr_scores_updated_at BEFORE UPDATE ON public.interview_hr_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.recompute_interview_avg()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_iv uuid; v_avg numeric;
BEGIN
  v_iv := COALESCE(NEW.interview_id, OLD.interview_id);
  SELECT AVG(score) INTO v_avg FROM public.interview_hr_scores
    WHERE interview_id = v_iv AND score IS NOT NULL;
  UPDATE public.interviews SET score = ROUND(v_avg, 1) WHERE id = v_iv;
  RETURN NULL;
END; $$;
CREATE TRIGGER trg_recompute_interview_avg
  AFTER INSERT OR UPDATE OR DELETE ON public.interview_hr_scores
  FOR EACH ROW EXECUTE FUNCTION public.recompute_interview_avg();

-- Function to get aggregate counts (how many HRs have scored)
CREATE OR REPLACE FUNCTION public.get_screening_score_stats(_application_id uuid)
RETURNS TABLE(hr_count int, avg_score numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::int, AVG(score)
  FROM public.screening_hr_scores
  WHERE application_id = _application_id AND score IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.get_interview_score_stats(_interview_id uuid)
RETURNS TABLE(hr_count int, avg_score numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::int, AVG(score)
  FROM public.interview_hr_scores
  WHERE interview_id = _interview_id AND score IS NOT NULL;
$$;
