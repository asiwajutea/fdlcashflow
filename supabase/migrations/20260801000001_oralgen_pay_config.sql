-- ─── OralGen Payment Configuration ──────────────────────────────────────────
--
-- Two-table design:
--
--   oralgen_pay_config    → role-level defaults (interviewer / field_manager)
--   oralgen_pay_override  → per-employee overrides (optional, take precedence)
--
-- Pay calculation rules (enforced at application layer):
--
--   Base salary:
--     • Unlocked once the agent records >= base_qualify_names within the month
--       (default 2 000 — stored in base_qualify_names, fully configurable)
--     • If names < base_qualify_names → base = 0
--
--   Commission:
--     • Only paid when names >= base_qualify_names
--     • commission = (names_this_month / monthly_quota) × commission_amount
--     • Capped at commission_amount (quota ratio > 1 does not increase payout
--       beyond the configured amount — adjust commission_amount for bonuses)
--
-- Roles stored as plain TEXT so they can be extended without an enum migration.
-- Valid values: 'interviewer', 'field_manager'
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Role-level defaults ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.oralgen_pay_config (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Which role this config applies to
  role                text        NOT NULL
                                  CHECK (role IN ('interviewer', 'field_manager'))
                                  UNIQUE,   -- one row per role

  -- Monthly base salary (₦ or configured currency)
  base_salary         numeric(12,2) NOT NULL DEFAULT 0
                                  CHECK (base_salary >= 0),

  -- Minimum names that must be completed in the month to unlock base + commission
  base_qualify_names  integer     NOT NULL DEFAULT 2000
                                  CHECK (base_qualify_names > 0),

  -- Monthly quota — the denominator in commission calculation
  monthly_quota       integer     NOT NULL DEFAULT 2000
                                  CHECK (monthly_quota > 0),

  -- Maximum commission payable at 100 % quota attainment
  commission_amount   numeric(12,2) NOT NULL DEFAULT 0
                                  CHECK (commission_amount >= 0),

  -- Soft notes for auditors / HR (not used in calculations)
  notes               text,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Seed sensible defaults for both roles so the pay engine never has missing rows
INSERT INTO public.oralgen_pay_config
  (role, base_salary, base_qualify_names, monthly_quota, commission_amount, notes)
VALUES
  ('interviewer',   0, 2000, 2000, 0, 'Default config — set actual values before going live'),
  ('field_manager', 0, 2000, 2000, 0, 'Default config — set actual values before going live')
ON CONFLICT (role) DO NOTHING;

-- Auto-update updated_at
CREATE TRIGGER trg_oralgen_pay_config_updated
  BEFORE UPDATE ON public.oralgen_pay_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── 2. Per-employee overrides ─────────────────────────────────────────────────
-- When a row exists for a user_id, its non-NULL columns replace the role default.
-- NULL means "inherit from role config".

CREATE TABLE IF NOT EXISTS public.oralgen_pay_override (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id             uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE (user_id),               -- one override row per employee

  -- NULL = inherit from oralgen_pay_config for this employee's role
  base_salary         numeric(12,2)
                                  CHECK (base_salary IS NULL OR base_salary >= 0),

  base_qualify_names  integer
                                  CHECK (base_qualify_names IS NULL OR base_qualify_names > 0),

  monthly_quota       integer
                                  CHECK (monthly_quota IS NULL OR monthly_quota > 0),

  commission_amount   numeric(12,2)
                                  CHECK (commission_amount IS NULL OR commission_amount >= 0),

  -- Optional: lock an override to a date range (NULL = always active)
  effective_from      date,
  effective_until     date,
  CHECK (effective_until IS NULL OR effective_until >= effective_from),

  notes               text,

  created_by          uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_oralgen_pay_override_user
  ON public.oralgen_pay_override (user_id);

CREATE TRIGGER trg_oralgen_pay_override_updated
  BEFORE UPDATE ON public.oralgen_pay_override
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── 3. RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE public.oralgen_pay_config   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oralgen_pay_override ENABLE ROW LEVEL SECURITY;

-- Config: admins + oralgen_admin can read and write; field agents read-only
--   (agents need to read their own config to display earnings on their dashboard)

CREATE POLICY "oralgen_pay_config_admin_all"
  ON public.oralgen_pay_config FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.user_has_capability(auth.uid(), 'oralgen_admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.user_has_capability(auth.uid(), 'oralgen_admin')
  );

CREATE POLICY "oralgen_pay_config_agents_read"
  ON public.oralgen_pay_config FOR SELECT TO authenticated
  USING (
    public.user_has_capability(auth.uid(), 'oralgen_interview')
    OR public.user_has_capability(auth.uid(), 'oralgen_audit')
  );

-- Override: admins + oralgen_admin can manage all rows;
--           employees can read their own override row
CREATE POLICY "oralgen_pay_override_admin_all"
  ON public.oralgen_pay_override FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.user_has_capability(auth.uid(), 'oralgen_admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.user_has_capability(auth.uid(), 'oralgen_admin')
  );

CREATE POLICY "oralgen_pay_override_self_read"
  ON public.oralgen_pay_override FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ── 4. Helpful view: resolved config per user ─────────────────────────────────
-- Returns the effective pay parameters for a given user by merging their
-- override (if any) with the role-level default.
-- The application can query this view directly instead of doing the COALESCE
-- logic itself.

CREATE OR REPLACE VIEW public.oralgen_pay_effective AS
SELECT
  p.id                                                  AS user_id,
  p.full_name,

  -- Determine role from capabilities
  CASE
    WHEN public.user_has_capability(p.id, 'oralgen_audit')     THEN 'field_manager'
    WHEN public.user_has_capability(p.id, 'oralgen_interview') THEN 'interviewer'
    ELSE NULL
  END                                                   AS role,

  -- Effective values: override wins if non-NULL, else role default
  COALESCE(ov.base_salary,         cfg.base_salary)         AS base_salary,
  COALESCE(ov.base_qualify_names,  cfg.base_qualify_names)  AS base_qualify_names,
  COALESCE(ov.monthly_quota,       cfg.monthly_quota)       AS monthly_quota,
  COALESCE(ov.commission_amount,   cfg.commission_amount)   AS commission_amount,

  -- Override metadata
  ov.effective_from,
  ov.effective_until,
  ov.notes                                              AS override_notes,

  -- Flags for the UI
  (ov.id IS NOT NULL)                                   AS has_override

FROM public.profiles p
LEFT JOIN public.oralgen_pay_override ov
       ON ov.user_id = p.id
      AND (ov.effective_from  IS NULL OR ov.effective_from  <= CURRENT_DATE)
      AND (ov.effective_until IS NULL OR ov.effective_until >= CURRENT_DATE)
LEFT JOIN public.oralgen_pay_config cfg
       ON cfg.role = CASE
            WHEN public.user_has_capability(p.id, 'oralgen_audit')     THEN 'field_manager'
            WHEN public.user_has_capability(p.id, 'oralgen_interview') THEN 'interviewer'
            ELSE NULL
          END
WHERE
  p.is_active = true
  AND (
    public.user_has_capability(p.id, 'oralgen_interview')
    OR public.user_has_capability(p.id, 'oralgen_audit')
  );

-- Grant read on the view
GRANT SELECT ON public.oralgen_pay_effective TO authenticated;
