-- Create employees table
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  designation TEXT NOT NULL,
  bank_name TEXT,
  account_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create invoices table
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  slip_number TEXT NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  date_issued DATE NOT NULL,
  gross_payment NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total_deductions NUMERIC(10, 2) NOT NULL DEFAULT 0,
  net_payment NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total_monthly_income NUMERIC(10, 2) NOT NULL DEFAULT 0,
  outstanding_iou NUMERIC(10, 2) NOT NULL DEFAULT 0,
  down_payment NUMERIC(10, 2) NOT NULL DEFAULT 0,
  egf NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total_savings NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create invoice_line_items table for earnings and deductions
CREATE TABLE public.invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('earning', 'deduction')),
  description TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for employees
CREATE POLICY "Admins can view employees"
  ON public.employees FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert employees"
  ON public.employees FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update employees"
  ON public.employees FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete employees"
  ON public.employees FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create RLS policies for invoices
CREATE POLICY "Admins can view invoices"
  ON public.invoices FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert invoices"
  ON public.invoices FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update invoices"
  ON public.invoices FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete invoices"
  ON public.invoices FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create RLS policies for invoice_line_items
CREATE POLICY "Admins can view invoice line items"
  ON public.invoice_line_items FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert invoice line items"
  ON public.invoice_line_items FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete invoice line items"
  ON public.invoice_line_items FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_invoices_employee_id ON public.invoices(employee_id);
CREATE INDEX idx_invoices_month_year ON public.invoices(year, month);
CREATE INDEX idx_invoice_line_items_invoice_id ON public.invoice_line_items(invoice_id);