REVOKE EXECUTE ON FUNCTION public.get_subordinate_user_ids(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.user_can_view_form_submissions(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_my_subordinates() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_subordinate_user_ids(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_view_form_submissions(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_subordinates() TO authenticated;