-- ─── Direct employee contract assignment ─────────────────────────────────────
--
-- The contracts table previously required an application_id (FK NOT NULL).
-- This migration adds a nullable user_id column so a contract can be assigned
-- directly to any platform user (employee) without going through the HR pipeline.
--
-- Rules:
--   • Either application_id OR user_id must be present (enforced by CHECK).
--   • application_id is made NULLABLE — existing rows keep their values.
--   • RLS: employees can view and sign contracts addressed directly to them.

-- 1. Make application_id nullable (existing rows are unaffected)
ALTER TABLE public.contracts
  ALTER COLUMN application_id DROP NOT NULL;

-- 2. Add nullable direct-assignment column
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 3. Enforce that at least one of the two identifiers is set
ALTER TABLE public.contracts
  DROP CONSTRAINT IF EXISTS contracts_has_target;
ALTER TABLE public.contracts
  ADD CONSTRAINT contracts_has_target
  CHECK (application_id IS NOT NULL OR user_id IS NOT NULL);

-- 4. Index for fast employee lookup
CREATE INDEX IF NOT EXISTS idx_contracts_user_id ON public.contracts(user_id);

-- 5. RLS — employees can view contracts assigned directly to them
DROP POLICY IF EXISTS "Users can view own direct contracts" ON public.contracts;
CREATE POLICY "Users can view own direct contracts"
  ON public.contracts FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 6. RLS — employees can update (sign) contracts assigned directly to them
DROP POLICY IF EXISTS "Users can sign own direct contracts" ON public.contracts;
CREATE POLICY "Users can sign own direct contracts"
  ON public.contracts FOR UPDATE TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
