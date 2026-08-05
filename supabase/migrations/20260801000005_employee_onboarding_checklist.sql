-- ─── Employee Onboarding Checklist ───────────────────────────────────────────
--
-- Tracks per-employee onboarding task completion.
-- The checklist_items table holds the master list of required tasks.
-- The employee_onboarding table holds the per-employee status for each task.

-- Master task definitions (admin-managed)
CREATE TABLE IF NOT EXISTS public.onboarding_checklist_items (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text        NOT NULL,
  description  text,
  category     text        NOT NULL DEFAULT 'General',   -- e.g. HR, IT, Finance, Compliance
  is_required  boolean     NOT NULL DEFAULT true,
  sort_order   integer     NOT NULL DEFAULT 0,
  is_active    boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Seed standard onboarding tasks
INSERT INTO public.onboarding_checklist_items (title, description, category, sort_order) VALUES
  ('Contract Signed',           'Employee has read and signed their employment contract.',       'HR',         10),
  ('ID / Passport submitted',   'Government-issued ID or passport received and verified.',       'HR',         20),
  ('Profile photo uploaded',    'Avatar/profile photo added to the platform profile.',           'HR',         30),
  ('Phone number verified',     'Mobile number added and confirmed in profile.',                 'HR',         40),
  ('Emergency contact added',   'Emergency contact details provided to HR.',                     'HR',         50),
  ('Bank account submitted',    'Bank account details received for payroll processing.',          'Finance',    60),
  ('Tax ID / BVN submitted',    'Tax identification number / BVN provided to Finance.',          'Finance',    70),
  ('IT equipment issued',       'Laptop / access card / tools issued and signed off.',           'IT',         80),
  ('Platform access granted',   'Employee can log in and access their dashboard.',               'IT',         90),
  ('Code of conduct signed',    'Employee has acknowledged and signed the code of conduct.',     'Compliance', 100),
  ('NDA signed',                'Non-disclosure agreement signed and filed.',                    'Compliance', 110),
  ('Induction completed',       'Company induction / orientation session attended.',             'General',    120),
  ('Manager introduction',      'Employee has been introduced to their direct manager.',         'General',    130),
  ('Team briefing done',        'Team meeting / welcome briefing completed.',                    'General',    140)
ON CONFLICT DO NOTHING;

CREATE TRIGGER trg_onboarding_items_updated
  BEFORE UPDATE ON public.onboarding_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Per-employee completion records
CREATE TABLE IF NOT EXISTS public.employee_onboarding (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id         uuid        NOT NULL REFERENCES public.onboarding_checklist_items(id) ON DELETE CASCADE,
  UNIQUE (user_id, item_id),
  completed       boolean     NOT NULL DEFAULT false,
  completed_at    timestamptz,
  completed_by    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emp_onboarding_user ON public.employee_onboarding(user_id);
CREATE INDEX IF NOT EXISTS idx_emp_onboarding_item ON public.employee_onboarding(item_id);

CREATE TRIGGER trg_employee_onboarding_updated
  BEFORE UPDATE ON public.employee_onboarding
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE public.onboarding_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_onboarding         ENABLE ROW LEVEL SECURITY;

-- Checklist items: all authenticated users can read; admins + manage_onboarding can write
CREATE POLICY "Anyone can read checklist items"
  ON public.onboarding_checklist_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage checklist items"
  ON public.onboarding_checklist_items FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.user_capabilities WHERE user_id = auth.uid() AND capability = 'manage_onboarding')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.user_capabilities WHERE user_id = auth.uid() AND capability = 'manage_onboarding')
  );

-- Onboarding records: admins + manage_onboarding can read/write all; employees read own
CREATE POLICY "HR can manage onboarding records"
  ON public.employee_onboarding FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.user_capabilities WHERE user_id = auth.uid() AND capability = 'manage_onboarding')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.user_capabilities WHERE user_id = auth.uid() AND capability = 'manage_onboarding')
  );

CREATE POLICY "Employees read own onboarding"
  ON public.employee_onboarding FOR SELECT TO authenticated
  USING (user_id = auth.uid());
