-- Employee dashboard: include the manager's designation and contact details so
-- the full-profile dialog can show them under the manager's name.
--
-- Adds three columns to get_my_manager()'s result:
--   * designation - the manager's title (positions.name, falling back to the
--     linked employees.designation when no position is set)
--   * email       - auth.users.email, falling back to employees.email
--   * phone       - profiles.phone
--
-- Keeps the team/project/department leadership fallback for resolving the
-- manager (see 20260608120000), stays SECURITY DEFINER and scoped to
-- auth.uid() so RLS on profiles is respected and no unrelated rows leak.

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
  position_name text,
  designation text,
  email text,
  phone text
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
    pos.name AS position_name,
    COALESCE(pos.name, (
      SELECT e.designation FROM public.employees e
      WHERE (e.user_id = m.id OR e.profile_id = m.id) AND e.designation IS NOT NULL
      LIMIT 1
    )) AS designation,
    COALESCE(au.email::text, (
      SELECT e.email FROM public.employees e
      WHERE (e.user_id = m.id OR e.profile_id = m.id) AND e.email IS NOT NULL
      LIMIT 1
    )) AS email,
    m.phone AS phone
  FROM resolved r
  JOIN public.profiles m ON m.id = r.manager_id
  LEFT JOIN public.positions pos ON pos.id = m.position_id
  LEFT JOIN auth.users au ON au.id = m.id;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_manager() TO authenticated;
