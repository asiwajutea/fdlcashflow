-- SECURITY DEFINER function so any authenticated user (including candidates)
-- can resolve display names for a list of user IDs without being blocked by
-- RLS on the profiles table.
CREATE OR REPLACE FUNCTION public.get_user_display_names(user_ids uuid[])
RETURNS TABLE(id uuid, display_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    COALESCE(NULLIF(trim(p.full_name), ''), split_part(u.email, '@', 1)) AS display_name
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.id = ANY(user_ids);
$$;

GRANT EXECUTE ON FUNCTION public.get_user_display_names(uuid[]) TO authenticated;
