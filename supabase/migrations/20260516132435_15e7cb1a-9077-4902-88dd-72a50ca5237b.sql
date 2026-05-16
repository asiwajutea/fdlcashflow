-- Leadership hierarchy
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS head_user_id uuid;
ALTER TABLE public.projects   ADD COLUMN IF NOT EXISTS lead_user_id uuid;
ALTER TABLE public.teams      ADD COLUMN IF NOT EXISTS lead_user_id uuid;
ALTER TABLE public.profiles   ADD COLUMN IF NOT EXISTS manager_id   uuid;

-- Form-level leader access overrides
CREATE TABLE IF NOT EXISTS public.activity_form_leader_overrides (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_id uuid NOT NULL,
  user_id uuid NOT NULL,
  can_view boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (form_id, user_id)
);
ALTER TABLE public.activity_form_leader_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage leader overrides" ON public.activity_form_leader_overrides;
CREATE POLICY "Admins manage leader overrides"
  ON public.activity_form_leader_overrides FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR user_has_capability(auth.uid(), 'manage_activity_forms'))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR user_has_capability(auth.uid(), 'manage_activity_forms'));

DROP POLICY IF EXISTS "Users read own overrides" ON public.activity_form_leader_overrides;
CREATE POLICY "Users read own overrides"
  ON public.activity_form_leader_overrides FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR user_has_capability(auth.uid(), 'manage_activity_forms'));

-- Recursive subordinate computation
CREATE OR REPLACE FUNCTION public.get_subordinate_user_ids(_user_id uuid)
RETURNS TABLE(user_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE direct AS (
    -- direct reports
    SELECT p.id AS user_id FROM public.profiles p WHERE p.manager_id = _user_id
    UNION
    -- team members where user leads team
    SELECT p.id FROM public.profiles p
      JOIN public.teams t ON t.id = p.team_id
      WHERE t.lead_user_id = _user_id
    UNION
    SELECT p.id FROM public.profiles p
      JOIN public.projects pr ON pr.id = p.project_id
      WHERE pr.lead_user_id = _user_id
    UNION
    SELECT p.id FROM public.profiles p
      JOIN public.departments d ON d.id = p.department_id
      WHERE d.head_user_id = _user_id
  ),
  chain AS (
    SELECT user_id FROM direct
    UNION
    SELECT p.id FROM public.profiles p
      JOIN chain c ON p.manager_id = c.user_id
  )
  SELECT user_id FROM chain WHERE user_id <> _user_id;
$$;

-- Form viewability for a leader
CREATE OR REPLACE FUNCTION public.user_can_view_form_submissions(_user_id uuid, _form_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN has_role(_user_id, 'admin'::app_role) THEN true
      WHEN user_has_capability(_user_id, 'manage_activity_forms') THEN true
      WHEN EXISTS (
        SELECT 1 FROM public.activity_form_leader_overrides o
         WHERE o.form_id = _form_id AND o.user_id = _user_id AND o.can_view = false
      ) THEN false
      WHEN EXISTS (
        SELECT 1 FROM public.activity_form_leader_overrides o
         WHERE o.form_id = _form_id AND o.user_id = _user_id AND o.can_view = true
      ) THEN true
      WHEN EXISTS (SELECT 1 FROM public.get_subordinate_user_ids(_user_id)) THEN true
      ELSE false
    END
$$;

-- RPC for client to read its own subordinates
CREATE OR REPLACE FUNCTION public.get_my_subordinates()
RETURNS TABLE(user_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT user_id FROM public.get_subordinate_user_ids(auth.uid()); $$;

-- Extend submissions SELECT policy to include leaders
DROP POLICY IF EXISTS "Leaders view subordinate submissions" ON public.activity_form_submissions;
CREATE POLICY "Leaders view subordinate submissions"
  ON public.activity_form_submissions FOR SELECT TO authenticated
  USING (
    user_can_view_form_submissions(auth.uid(), form_id)
    AND user_id IN (SELECT public.get_subordinate_user_ids(auth.uid()))
  );