-- Exclude inactive users from the org chart.
-- Active = profiles.is_active IS TRUE (NULLs treated as active for legacy rows).
CREATE OR REPLACE FUNCTION public.get_org_chart()
RETURNS TABLE(
  id uuid,
  full_name text,
  avatar_url text,
  position_name text,
  department_name text,
  manager_id uuid,
  role text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    p.id,
    COALESCE(NULLIF(p.full_name,''),'Unknown')::text AS full_name,
    p.avatar_url,
    COALESCE(pos.name, CASE WHEN ur.role::text='admin' THEN 'Admin' ELSE 'Employee' END)::text AS position_name,
    COALESCE(d.name, '')::text AS department_name,
    p.manager_id,
    ur.role::text AS role
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON ur.user_id = p.id
  LEFT JOIN public.positions pos ON pos.id = p.position_id
  LEFT JOIN public.departments d ON d.id = p.department_id
  WHERE ur.role IN ('employee','admin')
    AND COALESCE(p.approval_status,'approved') = 'approved'
    AND COALESCE(p.is_active, true) = true;   -- ← filter inactive
$$;

GRANT EXECUTE ON FUNCTION public.get_org_chart() TO authenticated;
