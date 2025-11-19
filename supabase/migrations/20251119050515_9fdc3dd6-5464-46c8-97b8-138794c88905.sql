-- Create daily_transactions table
CREATE TABLE public.daily_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  reference_id UUID,
  reference_type TEXT CHECK (reference_type IN ('invoice', 'weekly_record')),
  is_auto_generated BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.daily_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admins
CREATE POLICY "Admins can view daily transactions"
ON public.daily_transactions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert daily transactions"
ON public.daily_transactions
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update daily transactions"
ON public.daily_transactions
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete daily transactions"
ON public.daily_transactions
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for better performance
CREATE INDEX idx_daily_transactions_date ON public.daily_transactions(date);
CREATE INDEX idx_daily_transactions_type ON public.daily_transactions(type);
CREATE INDEX idx_daily_transactions_category ON public.daily_transactions(category);
CREATE INDEX idx_daily_transactions_reference ON public.daily_transactions(reference_id, reference_type);

-- Trigger for updated_at
CREATE TRIGGER update_daily_transactions_updated_at
BEFORE UPDATE ON public.daily_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();