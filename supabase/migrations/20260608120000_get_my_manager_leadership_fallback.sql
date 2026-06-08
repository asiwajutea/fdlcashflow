-- Employee dashboard: resolve the signed-in user's "direct manager" more robustly.
--
-- Previously get_my_manager() only looked at profiles.manager_id. But the
-- reporting relationship can also be expressed via leadership of the user's
-- team / project / department (teams.lead_user_id, projects.lead_user_id,
-- departments.head_user_id) - which is exactly what get_subordinate_user_ids()
-- already honours for the leader side.
--
-- As a result, an employee whose manager was assigned only as their team /
-- project / department lead (and not as an explicit profiles.manager_id) saw
-- NO manager on their dashboard, even though that leader sees them as a
-- subordinate. This redefines the function to fall back to those leadership
-- pointers so the two sides stay consistent.
--
-- Resolution priority: explicit profiles.manager_id, then team lead, then
-- project lead, then department head. Self-references are excluded so a lead
-- is never reported as their own manager. Still SECURITY DEFINER and scoped to
-- auth.uid() so RLS on profiles is respected.

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
  WITH me AS (
    SELECT p.id, p.manager_id, p.team_id, p.project_id, p.department_id
    FROM public.profiles p
    WHERE p.id = auth.uid()
  ),
  resolved AS (
    SELECT COALESCE(
      me.manager_id,
      (SELECT t.lead_user_id FROM public.teams t
        WHERE t.id = me.team_id AND t.lead_user_id IS NOT NULL AND t.lead_user_id <> me.id),
      (SELECT pr.lead_user_id FROM public.projects pr
        WHERE pr.id = me.project_id AND pr.lead_user_id IS NOT NULL AND pr.lead_user_id <> me.id),
      (SELECT d.head_user_id FROM public.departments d
        WHERE d.id = me.department_id AND d.head_user_id IS NOT NULL AND d.head_user_id <> me.id)
    ) AS manager_id
    FROM me
  )
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
  FROM resolved r
  JOIN public.profiles m ON m.id = r.manager_id
  LEFT JOIN public.positions pos ON pos.id = m.position_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_manager() TO authenticated;
