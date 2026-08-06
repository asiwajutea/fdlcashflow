-- ─── Contract offer workflow: reject / negotiate / respond ───────────────────
--
-- Extends the contracts table with fields to support:
--   • Candidate rejection (with reason)
--   • Candidate negotiation (with note)
--   • HR response to negotiation (accept/reject + HR note)
--   • Full audit trail visible to both parties
--
-- Status values added: 'rejected' | 'negotiating' | 'negotiation_accepted'
--                      | 'negotiation_rejected' | 'cancelled'
-- (existing: 'pending', 'signed')

ALTER TABLE public.contracts
  -- When candidate rejects or negotiates
  ADD COLUMN IF NOT EXISTS candidate_action       text,    -- 'rejected' | 'negotiating'
  ADD COLUMN IF NOT EXISTS candidate_reason       text,    -- rejection reason or negotiation note
  ADD COLUMN IF NOT EXISTS candidate_actioned_at  timestamptz,

  -- When HR responds to a negotiation
  ADD COLUMN IF NOT EXISTS hr_response            text,    -- 'accepted' | 'rejected'
  ADD COLUMN IF NOT EXISTS hr_note                text,    -- always visible to candidate
  ADD COLUMN IF NOT EXISTS hr_responded_at        timestamptz,
  ADD COLUMN IF NOT EXISTS hr_responded_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Link to a replacement contract when negotiation is accepted + new offer sent
  ADD COLUMN IF NOT EXISTS replaced_by_id         uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS replaces_id            uuid REFERENCES public.contracts(id) ON DELETE SET NULL;

-- ── RLS: candidates can now update their own pending contracts to reject/negotiate
-- The existing "Candidates can update own contracts for signing" policy already
-- covers the UPDATE path — we rely on the application-level check for the new
-- candidate_action field. No additional RLS change needed.

-- ── Index for fast lookup of replacement chains
CREATE INDEX IF NOT EXISTS idx_contracts_replaced_by ON public.contracts(replaced_by_id);
CREATE INDEX IF NOT EXISTS idx_contracts_replaces    ON public.contracts(replaces_id);
