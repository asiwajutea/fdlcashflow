-- Add is_taxable column to invoice_line_items table
ALTER TABLE public.invoice_line_items 
ADD COLUMN is_taxable boolean DEFAULT true;

-- Add tax tracking columns to invoices table for YTD calculations
ALTER TABLE public.invoices 
ADD COLUMN taxable_income numeric DEFAULT 0,
ADD COLUMN ytd_taxable_income numeric DEFAULT 0,
ADD COLUMN ytd_tax_paid numeric DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN public.invoice_line_items.is_taxable IS 'Whether this earning item is taxable for PAYE calculation. Only applies to earning items.';
COMMENT ON COLUMN public.invoices.taxable_income IS 'The taxable portion of gross payment for this month (sum of taxable earnings)';
COMMENT ON COLUMN public.invoices.ytd_taxable_income IS 'Year-to-date taxable income prior to this payslip for audit trail';
COMMENT ON COLUMN public.invoices.ytd_tax_paid IS 'Year-to-date tax paid prior to this payslip for audit trail';