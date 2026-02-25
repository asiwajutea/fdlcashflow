
-- Employees table
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT NOT NULL DEFAULT '',
  full_name TEXT NOT NULL DEFAULT '',
  designation TEXT NOT NULL DEFAULT '',
  bank_name TEXT DEFAULT '',
  account_number TEXT DEFAULT '',
  email TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read employees" ON public.employees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage employees" ON public.employees FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Invoices table
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL DEFAULT '',
  slip_number TEXT NOT NULL DEFAULT '',
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  date_issued DATE NOT NULL DEFAULT CURRENT_DATE,
  gross_payment NUMERIC NOT NULL DEFAULT 0,
  total_deductions NUMERIC NOT NULL DEFAULT 0,
  net_payment NUMERIC NOT NULL DEFAULT 0,
  total_monthly_income NUMERIC NOT NULL DEFAULT 0,
  outstanding_iou NUMERIC NOT NULL DEFAULT 0,
  down_payment NUMERIC NOT NULL DEFAULT 0,
  egf NUMERIC NOT NULL DEFAULT 0,
  total_savings NUMERIC NOT NULL DEFAULT 0,
  paye_tax NUMERIC NOT NULL DEFAULT 0,
  nhf NUMERIC NOT NULL DEFAULT 0,
  pension NUMERIC NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read invoices" ON public.invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage invoices" ON public.invoices FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Invoice line items table
CREATE TABLE public.invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL DEFAULT '',
  amount NUMERIC NOT NULL DEFAULT 0,
  item_type TEXT NOT NULL DEFAULT 'earning',
  is_taxable BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read line items" ON public.invoice_line_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage line items" ON public.invoice_line_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Add signature_data column to contracts
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS signature_data TEXT DEFAULT '';
