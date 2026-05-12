ALTER TABLE public.activity_forms
  ADD COLUMN IF NOT EXISTS analytics_employee_visible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS analytics_visible_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS analytics_visible_to_submitter boolean NOT NULL DEFAULT true;