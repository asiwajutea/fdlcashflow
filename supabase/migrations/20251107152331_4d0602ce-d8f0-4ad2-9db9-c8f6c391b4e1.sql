-- Add company settings table for invoice template customization
CREATE TABLE public.company_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name text NOT NULL DEFAULT 'FULLDATALINKING LTD',
  company_address text NOT NULL DEFAULT 'No. 9 Alhaji Basiru Street, Off Alidada Bus stop, Iyana-Ipaja, Lagos',
  company_phone text NOT NULL DEFAULT '08035102224',
  company_email text,
  logo_url text,
  invoice_footer text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view company settings"
  ON public.company_settings FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert company settings"
  ON public.company_settings FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update company settings"
  ON public.company_settings FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON public.company_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add email field to employees table for sending invoices
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS email text;

-- Insert default company settings
INSERT INTO public.company_settings (company_name, company_address, company_phone)
VALUES ('FULLDATALINKING LTD', 'No. 9 Alhaji Basiru Street, Off Alidada Bus stop, Iyana-Ipaja, Lagos', '08035102224');