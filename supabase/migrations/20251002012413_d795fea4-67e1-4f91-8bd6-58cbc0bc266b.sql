-- Add detailed rate columns to rate_configurations
ALTER TABLE public.rate_configurations
  -- Update income rates that exist
  ALTER COLUMN data_entry_rate SET DEFAULT 15,
  ALTER COLUMN bac_audit_rate SET DEFAULT 5,
  ALTER COLUMN metadata_audit_rate SET DEFAULT 5,
  ALTER COLUMN virtual_audit_rate SET DEFAULT 5,
  
  -- Rename booklet_rate to booklet_monthly_income for clarity
  ADD COLUMN IF NOT EXISTS booklet_monthly_income NUMERIC NOT NULL DEFAULT 65000;

-- Add Field Staff Salaries (per name) columns
ALTER TABLE public.rate_configurations
  ADD COLUMN IF NOT EXISTS field_agent_rate NUMERIC NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS field_manager_rate NUMERIC NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS booking_agent_rate NUMERIC NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS field_relation_rate NUMERIC NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS field_misc_rate NUMERIC NOT NULL DEFAULT 5;

-- Add Data Entry (per name) columns
ALTER TABLE public.rate_configurations
  ADD COLUMN IF NOT EXISTS data_entry_clerks_rate NUMERIC NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS qa_manager_rate NUMERIC NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS data_entry_misc_rate NUMERIC NOT NULL DEFAULT 2;

-- Add Production Manager (per name) columns
ALTER TABLE public.rate_configurations
  ADD COLUMN IF NOT EXISTS pm_field_work_rate NUMERIC NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS pm_data_entry_rate NUMERIC NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS pm_bac_audit_rate NUMERIC NOT NULL DEFAULT 2;

-- Add Fixed Monthly Salaries columns
ALTER TABLE public.rate_configurations
  ADD COLUMN IF NOT EXISTS field_relation_supervisor_salary NUMERIC NOT NULL DEFAULT 80000,
  ADD COLUMN IF NOT EXISTS administrative_assistant_salary NUMERIC NOT NULL DEFAULT 45000,
  ADD COLUMN IF NOT EXISTS field_relation_officers_salary NUMERIC NOT NULL DEFAULT 100000;

-- Add Recurring Monthly Costs columns
ALTER TABLE public.rate_configurations
  ADD COLUMN IF NOT EXISTS power_plant_monthly NUMERIC NOT NULL DEFAULT 60000,
  ADD COLUMN IF NOT EXISTS office_data_subscription_monthly NUMERIC NOT NULL DEFAULT 20000,
  ADD COLUMN IF NOT EXISTS staff_data_support_monthly NUMERIC NOT NULL DEFAULT 20000;

-- Add Percentage-Based columns (stored as decimals)
ALTER TABLE public.rate_configurations
  ADD COLUMN IF NOT EXISTS employee_gratuity_rate NUMERIC NOT NULL DEFAULT 0.075,
  ADD COLUMN IF NOT EXISTS logistics_rate NUMERIC NOT NULL DEFAULT 0.03,
  ADD COLUMN IF NOT EXISTS incentives_rate NUMERIC NOT NULL DEFAULT 0.02;

-- Update existing records with default values
UPDATE public.rate_configurations
SET 
  data_entry_rate = 15,
  bac_audit_rate = 5,
  metadata_audit_rate = 5,
  virtual_audit_rate = 5,
  booklet_monthly_income = 65000
WHERE data_entry_rate = 0;