-- ─── Add configurable page margin columns to contract_templates ──────────────
-- These control the A4 page margins used in the on-screen preview and PDF export.
-- Defaults match the hardcoded values that were previously in ContractRenderer.tsx.

ALTER TABLE public.contract_templates
  ADD COLUMN IF NOT EXISTS margin_top    integer NOT NULL DEFAULT 56,
  ADD COLUMN IF NOT EXISTS margin_bottom integer NOT NULL DEFAULT 56,
  ADD COLUMN IF NOT EXISTS margin_left   integer NOT NULL DEFAULT 64,
  ADD COLUMN IF NOT EXISTS margin_right  integer NOT NULL DEFAULT 64;
