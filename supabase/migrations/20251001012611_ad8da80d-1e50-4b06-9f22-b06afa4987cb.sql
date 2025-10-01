-- Create rate_configurations table to store all financial rates and fixed expenses
CREATE TABLE public.rate_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  effective_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Variable income rates (per unit)
  field_work_rate NUMERIC NOT NULL DEFAULT 90,
  virtual_audit_rate NUMERIC NOT NULL DEFAULT 0,
  data_entry_rate NUMERIC NOT NULL DEFAULT 0,
  bac_audit_rate NUMERIC NOT NULL DEFAULT 0,
  metadata_audit_rate NUMERIC NOT NULL DEFAULT 0,
  booklet_rate NUMERIC NOT NULL DEFAULT 0,
  
  -- Fixed monthly expenses
  production_manager_salary NUMERIC NOT NULL DEFAULT 0,
  fixed_monthly_salaries NUMERIC NOT NULL DEFAULT 0,
  operations_utilities NUMERIC NOT NULL DEFAULT 0,
  employee_gratuity NUMERIC NOT NULL DEFAULT 0,
  logistics NUMERIC NOT NULL DEFAULT 0,
  incentives NUMERIC NOT NULL DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rate_configurations ENABLE ROW LEVEL SECURITY;

-- Create policy for rate_configurations
CREATE POLICY "Allow all operations on rate_configurations" 
ON public.rate_configurations 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Add rate_config_id to weekly_records to track which rates were used
ALTER TABLE public.weekly_records 
ADD COLUMN rate_config_id UUID REFERENCES public.rate_configurations(id);

-- Create trigger for automatic timestamp updates on rate_configurations
CREATE TRIGGER update_rate_configurations_updated_at
BEFORE UPDATE ON public.rate_configurations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups of active rate configurations
CREATE INDEX idx_rate_configurations_effective_from ON public.rate_configurations(effective_from DESC);

-- Insert initial rate configuration with default values
INSERT INTO public.rate_configurations (
  field_work_rate,
  virtual_audit_rate,
  data_entry_rate,
  bac_audit_rate,
  metadata_audit_rate,
  booklet_rate,
  production_manager_salary,
  fixed_monthly_salaries,
  operations_utilities,
  employee_gratuity,
  logistics,
  incentives
) VALUES (
  90, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0
);