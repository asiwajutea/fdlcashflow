-- Create tables for FDL Financial Cashflow Management System

-- Weekly financial records table
CREATE TABLE public.weekly_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  
  -- Income data
  field_work INTEGER NOT NULL DEFAULT 0,
  data_entry INTEGER NOT NULL DEFAULT 0,
  bac_audit INTEGER NOT NULL DEFAULT 0,
  metadata_audit INTEGER NOT NULL DEFAULT 0,
  virtual_audit INTEGER NOT NULL DEFAULT 0,
  booklet_income DECIMAL(12,2) NOT NULL DEFAULT 0,
  
  -- Calculated totals
  total_income DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_expenses DECIMAL(12,2) NOT NULL DEFAULT 0,
  net_cashflow DECIMAL(12,2) NOT NULL DEFAULT 0,
  
  -- Other expenses (JSON for flexibility)
  other_expenses JSONB DEFAULT '[]',
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Unique constraint for week/year combination
  UNIQUE(week_number, year)
);

-- Enable RLS on weekly_records
ALTER TABLE public.weekly_records ENABLE ROW LEVEL SECURITY;

-- Create policy for weekly_records (public access for now, can be restricted later)
CREATE POLICY "Allow all operations on weekly_records" 
ON public.weekly_records 
FOR ALL 
USING (true)
WITH CHECK (true);

-- AI chat conversations table
CREATE TABLE public.ai_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- AI chat messages table
CREATE TABLE public.ai_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on AI tables
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for AI tables
CREATE POLICY "Allow all operations on ai_conversations" 
ON public.ai_conversations 
FOR ALL 
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all operations on ai_messages" 
ON public.ai_messages 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_weekly_records_updated_at
  BEFORE UPDATE ON public.weekly_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_conversations_updated_at
  BEFORE UPDATE ON public.ai_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();