-- Add updated_at to applications table (was referenced by trigger but column was missing)
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Backfill: set updated_at = applied_at for existing rows so dates are meaningful
UPDATE public.applications
SET updated_at = applied_at
WHERE updated_at = now();
