
-- Finance categories (admin editable)
CREATE TABLE public.finance_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('reimbursement','cash_advance')),
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.finance_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read finance_categories" ON public.finance_categories
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage finance_categories" ON public.finance_categories
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

INSERT INTO public.finance_categories (kind, name, display_order) VALUES
  ('reimbursement','Travel',1),
  ('reimbursement','Meals',2),
  ('reimbursement','Supplies',3),
  ('reimbursement','Medical',4),
  ('reimbursement','Other',5),
  ('cash_advance','Project',1),
  ('cash_advance','Field Ops',2),
  ('cash_advance','Other',3);

-- Advance requests
CREATE TABLE public.advance_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('salary_advance','reimbursement','cash_advance')),
  category_id uuid REFERENCES public.finance_categories(id) ON DELETE SET NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  reason text NOT NULL DEFAULT '',
  receipt_url text DEFAULT '',
  repayment_plan text CHECK (repayment_plan IN ('one','two')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','repaid')),
  approver_id uuid,
  approver_note text DEFAULT '',
  repaid_count int NOT NULL DEFAULT 0,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.advance_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read own requests" ON public.advance_requests
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Owners insert own requests" ON public.advance_requests
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'pending');
CREATE POLICY "Owners update own pending" ON public.advance_requests
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status = 'pending')
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Approvers manage requests" ON public.advance_requests
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR user_has_capability(auth.uid(),'approve_finance_requests'))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR user_has_capability(auth.uid(),'approve_finance_requests'));

CREATE POLICY "Leaders read subordinate requests" ON public.advance_requests
  FOR SELECT TO authenticated
  USING (user_id IN (SELECT user_id FROM get_subordinate_user_ids(auth.uid())));

CREATE TRIGGER trg_advance_requests_updated
  BEFORE UPDATE ON public.advance_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Advance repayments
CREATE TABLE public.advance_repayments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advance_id uuid NOT NULL REFERENCES public.advance_requests(id) ON DELETE CASCADE,
  invoice_id uuid,
  amount numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.advance_repayments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners/admins read repayments" ON public.advance_repayments
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.advance_requests a WHERE a.id = advance_id AND (
      a.user_id = auth.uid()
      OR has_role(auth.uid(),'admin'::app_role)
      OR user_has_capability(auth.uid(),'approve_finance_requests')
      OR a.user_id IN (SELECT user_id FROM get_subordinate_user_ids(auth.uid()))
    ))
  );
CREATE POLICY "Approvers write repayments" ON public.advance_repayments
  FOR INSERT TO authenticated WITH CHECK (
    has_role(auth.uid(),'admin'::app_role)
    OR user_has_capability(auth.uid(),'approve_finance_requests')
    OR user_has_capability(auth.uid(),'generate_invoice')
  );

-- Finance budgets
CREATE TABLE public.finance_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type text NOT NULL CHECK (scope_type IN ('user','role','department')),
  scope_id text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('reimbursement','cash_advance','salary_advance')),
  category_id uuid REFERENCES public.finance_categories(id) ON DELETE SET NULL,
  monthly_limit numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.finance_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read budgets" ON public.finance_budgets
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage budgets" ON public.finance_budgets
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER trg_finance_budgets_updated
  BEFORE UPDATE ON public.finance_budgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_advance_requests_user ON public.advance_requests(user_id);
CREATE INDEX idx_advance_requests_status ON public.advance_requests(status);
CREATE INDEX idx_advance_repayments_advance ON public.advance_repayments(advance_id);
