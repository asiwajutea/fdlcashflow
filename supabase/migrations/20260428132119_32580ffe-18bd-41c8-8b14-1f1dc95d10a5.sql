REVOKE EXECUTE ON FUNCTION public.user_has_capability(UUID, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.user_can_access_form(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_has_capability(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_access_form(UUID, UUID) TO authenticated;