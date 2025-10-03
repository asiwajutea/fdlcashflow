-- Create rate change history table
CREATE TABLE IF NOT EXISTS public.rate_change_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rate_config_id UUID NOT NULL REFERENCES public.rate_configurations(id),
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  change_summary TEXT,
  previous_config JSONB,
  new_config JSONB
);

-- Enable RLS
ALTER TABLE public.rate_change_history ENABLE ROW LEVEL SECURITY;

-- Create policy for rate change history
CREATE POLICY "Allow all operations on rate_change_history"
  ON public.rate_change_history
  FOR ALL
  USING (true)
  WITH CHECK (true);