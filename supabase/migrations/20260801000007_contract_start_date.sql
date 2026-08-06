-- Add start_date to contracts so HR can set it when sending an offer.
-- This value is used to interpolate {{start_date}} in contract templates.
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS start_date date;
