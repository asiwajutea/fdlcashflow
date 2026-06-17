-- Stores a set of custom screening questions per job position.
-- If a job has a template, it is used instead of AI generation when
-- an application moves to screening status.

CREATE TABLE public.job_screening_templates (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id         UUID NOT NULL REFERENCES public.job_positions(id) ON DELETE CASCADE,
  questions      JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id)
);

ALTER TABLE public.job_screening_templates ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage screening templates"
ON public.job_screening_templates FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Users with add_job_position capability can manage templates
CREATE POLICY "Job managers can manage screening templates"
ON public.job_screening_templates FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_capabilities WHERE user_id = auth.uid() AND capability = 'add_job_position')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_capabilities WHERE user_id = auth.uid() AND capability = 'add_job_position')
);

-- HR staff with manage_recruitment can read templates (needed when generating screening)
CREATE POLICY "HR staff can read screening templates"
ON public.job_screening_templates FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_capabilities WHERE user_id = auth.uid() AND capability = 'manage_recruitment')
);

-- Trigger to keep updated_at current
CREATE TRIGGER update_job_screening_templates_updated_at
  BEFORE UPDATE ON public.job_screening_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
