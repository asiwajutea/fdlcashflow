-- Add new capability via seeding (capability strings are free-form in user_capabilities table)

-- Activity forms (form definitions)
CREATE TABLE public.activity_forms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  frequency TEXT NOT NULL DEFAULT 'daily', -- daily | weekly | monthly | one_off
  due_day INTEGER, -- day of week (0-6) for weekly, day of month (1-31) for monthly
  due_time TIME, -- optional time of day
  reminders_enabled BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  manager_visible BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Form fields
CREATE TABLE public.activity_form_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID NOT NULL REFERENCES public.activity_forms(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type TEXT NOT NULL, -- text|textarea|number|date|time|select|multiselect|radio|checkbox|yesno|file|rating|signature|section|lookup
  placeholder TEXT,
  help_text TEXT,
  is_required BOOLEAN NOT NULL DEFAULT false,
  options JSONB DEFAULT '[]'::jsonb, -- for select/radio/multiselect/checkbox
  lookup_source TEXT, -- departments|projects|teams|positions|employees
  validation JSONB DEFAULT '{}'::jsonb, -- min/max/pattern
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(form_id, field_key)
);

-- Assignments
CREATE TABLE public.activity_form_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID NOT NULL REFERENCES public.activity_forms(id) ON DELETE CASCADE,
  assignment_type TEXT NOT NULL, -- user|department|team|position|capability|everyone
  target_id UUID, -- references the relevant entity for user/department/team/position
  capability_key TEXT, -- when type=capability
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Submissions
CREATE TABLE public.activity_form_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id UUID NOT NULL REFERENCES public.activity_forms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  period_key TEXT NOT NULL, -- 'YYYY-MM-DD' for daily, 'YYYY-Wxx' for weekly, 'YYYY-MM' monthly, 'once' one_off
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(form_id, user_id, period_key)
);

CREATE INDEX idx_aff_form ON public.activity_form_fields(form_id, display_order);
CREATE INDEX idx_afa_form ON public.activity_form_assignments(form_id);
CREATE INDEX idx_afs_user ON public.activity_form_submissions(user_id, submitted_at DESC);
CREATE INDEX idx_afs_form ON public.activity_form_submissions(form_id, submitted_at DESC);

-- Enable RLS
ALTER TABLE public.activity_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_form_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_form_submissions ENABLE ROW LEVEL SECURITY;

-- Helper: check user capability
CREATE OR REPLACE FUNCTION public.user_has_capability(_user_id UUID, _cap TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_capabilities
    WHERE user_id = _user_id AND capability = _cap
  );
$$;

-- Helper: check if a form is assigned to a given user
CREATE OR REPLACE FUNCTION public.user_can_access_form(_user_id UUID, _form_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.activity_form_assignments a
    LEFT JOIN public.profiles p ON p.id = _user_id
    WHERE a.form_id = _form_id
      AND (
        a.assignment_type = 'everyone'
        OR (a.assignment_type = 'user' AND a.target_id = _user_id)
        OR (a.assignment_type = 'department' AND a.target_id = p.department_id)
        OR (a.assignment_type = 'team' AND a.target_id = p.team_id)
        OR (a.assignment_type = 'position' AND a.target_id = p.position_id)
        OR (a.assignment_type = 'capability' AND public.user_has_capability(_user_id, a.capability_key))
      )
  );
$$;

-- RLS: activity_forms
CREATE POLICY "Managers manage all forms" ON public.activity_forms
  FOR ALL TO authenticated
  USING (public.user_has_capability(auth.uid(), 'manage_activity_forms'))
  WITH CHECK (public.user_has_capability(auth.uid(), 'manage_activity_forms'));

CREATE POLICY "Assigned users view their forms" ON public.activity_forms
  FOR SELECT TO authenticated
  USING (is_active = true AND public.user_can_access_form(auth.uid(), id));

-- RLS: fields
CREATE POLICY "Managers manage form fields" ON public.activity_form_fields
  FOR ALL TO authenticated
  USING (public.user_has_capability(auth.uid(), 'manage_activity_forms'))
  WITH CHECK (public.user_has_capability(auth.uid(), 'manage_activity_forms'));

CREATE POLICY "Assigned users view fields" ON public.activity_form_fields
  FOR SELECT TO authenticated
  USING (public.user_can_access_form(auth.uid(), form_id));

-- RLS: assignments
CREATE POLICY "Managers manage assignments" ON public.activity_form_assignments
  FOR ALL TO authenticated
  USING (public.user_has_capability(auth.uid(), 'manage_activity_forms'))
  WITH CHECK (public.user_has_capability(auth.uid(), 'manage_activity_forms'));

CREATE POLICY "Users view assignments for accessible forms" ON public.activity_form_assignments
  FOR SELECT TO authenticated
  USING (public.user_can_access_form(auth.uid(), form_id));

-- RLS: submissions
CREATE POLICY "Users insert their own submissions" ON public.activity_form_submissions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.user_can_access_form(auth.uid(), form_id));

CREATE POLICY "Users update their own submissions" ON public.activity_form_submissions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users view their own submissions" ON public.activity_form_submissions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Managers view all submissions" ON public.activity_form_submissions
  FOR SELECT TO authenticated
  USING (public.user_has_capability(auth.uid(), 'manage_activity_forms'));

CREATE POLICY "Managers delete submissions" ON public.activity_form_submissions
  FOR DELETE TO authenticated
  USING (public.user_has_capability(auth.uid(), 'manage_activity_forms'));

-- Updated_at trigger
CREATE TRIGGER trg_activity_forms_updated
BEFORE UPDATE ON public.activity_forms
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();