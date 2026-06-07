-- Employee dashboard: show the signed-in user's direct manager.
--
-- RLS on public.profiles restricts SELECT to the caller's own row (or admins):
--   USING (id = auth.uid() OR has_role(auth.uid(), 'admin'))
-- This means a regular employee cannot read their assigned manager's profile
-- row, so the dashboard's direct manager card never rendered for non-admins.
--
-- This SECURITY DEFINER function returns ONLY the caller's own direct manager,
-- scoped to auth.uid(), exposing just the fields the dashboard needs (display
-- info + About Me). It follows the same pattern as get_org_chart().

CREATE OR REPLACE FUNCTION public.get_my_manager()
RETURNS TABLE(
  id uuid,
  full_name text,
  avatar_url text,
  about_me text,
  about_me_excerpt text,
  about_details jsonb,
  about_visibility jsonb,
  position_id uuid,
  position_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.id,
    m.full_name,
    m.avatar_url,
    m.about_me,
    m.about_me_excerpt,
    m.about_details,
    m.about_visibility,
    m.position_id,
    pos.name AS position_name
  FROM public.profiles me
  JOIN public.profiles m ON m.id = me.manager_id
  LEFT JOIN public.positions pos ON pos.id = m.position_id
  WHERE me.id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_manager() TO authenticated;
