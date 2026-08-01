-- ─── Fix oralgen_pay_effective view ──────────────────────────────────────────
--
-- The original view used public.user_has_capability(p.id, ...) to determine
-- each employee's role. That function checks user_capabilities via RLS, which
-- means it only returns rows visible to the CURRENT USER — not the user being
-- looked up. When an admin queries the view, all other users' capabilities are
-- invisible, so roles come back NULL and those users are filtered out entirely.
--
-- Fix: replace the function calls with direct correlated subqueries against
-- user_capabilities, wrapped in a SECURITY DEFINER function so they bypass RLS
-- and always see all capability rows regardless of who is querying.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Helper function: check if a given user_id has a capability
--    SECURITY DEFINER so it bypasses user_capabilities RLS when called
--    from the view (which may be queried by admin or service role).
CREATE OR REPLACE FUNCTION public.oralgen_has_capability(
  _user_id UUID,
  _capability TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_capabilities
    WHERE user_id = _user_id
      AND capability = _capability
  );
$$;

-- Grant execute to authenticated users (needed for view execution)
GRANT EXECUTE ON FUNCTION public.oralgen_has_capability(UUID, TEXT) TO authenticated;

-- 2. Recreate the view using the new security-definer helper
CREATE OR REPLACE VIEW public.oralgen_pay_effective AS
SELECT
  p.id                                                  AS user_id,
  p.full_name,

  -- Determine role: audit capability → field_manager, interview → interviewer
  CASE
    WHEN public.oralgen_has_capability(p.id, 'oralgen_audit')     THEN 'field_manager'
    WHEN public.oralgen_has_capability(p.id, 'oralgen_interview') THEN 'interviewer'
    ELSE NULL
  END                                                   AS role,

  -- Effective pay values (override wins over role default)
  COALESCE(ov.base_salary,         cfg.base_salary)         AS base_salary,
  COALESCE(ov.base_qualify_names,  cfg.base_qualify_names)  AS base_qualify_names,
  COALESCE(ov.monthly_quota,       cfg.monthly_quota)       AS monthly_quota,
  COALESCE(ov.commission_amount,   cfg.commission_amount)   AS commission_amount,

  ov.effective_from,
  ov.effective_until,
  ov.notes                                              AS override_notes,
  (ov.id IS NOT NULL)                                   AS has_override

FROM public.profiles p
LEFT JOIN public.oralgen_pay_override ov
       ON ov.user_id = p.id
      AND (ov.effective_from  IS NULL OR ov.effective_from  <= CURRENT_DATE)
      AND (ov.effective_until IS NULL OR ov.effective_until >= CURRENT_DATE)
LEFT JOIN public.oralgen_pay_config cfg
       ON cfg.role = CASE
            WHEN public.oralgen_has_capability(p.id, 'oralgen_audit')     THEN 'field_manager'
            WHEN public.oralgen_has_capability(p.id, 'oralgen_interview') THEN 'interviewer'
            ELSE NULL
          END
WHERE
  p.is_active = true
  AND (
    public.oralgen_has_capability(p.id, 'oralgen_interview')
    OR  public.oralgen_has_capability(p.id, 'oralgen_audit')
  );

-- Re-grant SELECT on the view
GRANT SELECT ON public.oralgen_pay_effective TO authenticated;
