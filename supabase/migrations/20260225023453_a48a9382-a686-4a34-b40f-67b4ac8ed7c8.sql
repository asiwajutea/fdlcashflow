
ALTER TABLE public.rate_change_history ADD COLUMN IF NOT EXISTS change_summary TEXT DEFAULT '';
ALTER TABLE public.rate_change_history ADD COLUMN IF NOT EXISTS previous_config JSONB DEFAULT '{}';
ALTER TABLE public.rate_change_history ADD COLUMN IF NOT EXISTS new_config JSONB DEFAULT '{}';
