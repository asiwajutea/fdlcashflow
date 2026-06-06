
-- 1. chat_global_policy (singleton)
CREATE TABLE IF NOT EXISTS public.chat_global_policy (
  id smallint PRIMARY KEY DEFAULT 1,
  all_users_mode text NOT NULL DEFAULT 'anyone' CHECK (all_users_mode IN ('anyone','restricted')),
  allow_managers boolean NOT NULL DEFAULT true,
  allow_same_department boolean NOT NULL DEFAULT false,
  allow_same_team boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chat_global_policy_singleton CHECK (id = 1)
);
GRANT SELECT ON public.chat_global_policy TO authenticated;
GRANT ALL ON public.chat_global_policy TO service_role;
ALTER TABLE public.chat_global_policy ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read chat policy" ON public.chat_global_policy FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage chat policy" ON public.chat_global_policy FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
INSERT INTO public.chat_global_policy (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- 2. chat_user_blocks
CREATE TABLE IF NOT EXISTS public.chat_user_blocks (
  blocked_user_id uuid PRIMARY KEY,
  except_user_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.chat_user_blocks TO authenticated;
GRANT ALL ON public.chat_user_blocks TO service_role;
ALTER TABLE public.chat_user_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read user blocks" ON public.chat_user_blocks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage user blocks" ON public.chat_user_blocks FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- 3. contract_templates
CREATE TABLE IF NOT EXISTS public.contract_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  position_id uuid REFERENCES public.positions(id) ON DELETE SET NULL,
  role_name text NOT NULL DEFAULT '',
  body_html text NOT NULL DEFAULT '',
  file_url text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.contract_templates TO authenticated;
GRANT ALL ON public.contract_templates TO service_role;
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read active templates" ON public.contract_templates FOR SELECT TO authenticated USING (is_active = true OR has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage templates" ON public.contract_templates FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_contract_templates_updated BEFORE UPDATE ON public.contract_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Extend contracts
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.contract_templates(id) ON DELETE SET NULL;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS signed_full_name text DEFAULT '';
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS body_html text DEFAULT '';
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

-- 5. can_message helper
CREATE OR REPLACE FUNCTION public.can_message(_from uuid, _to uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_policy record;
  v_block record;
  v_from_role text;
  v_to_role text;
  v_from_dept uuid;
  v_to_dept uuid;
  v_from_team uuid;
  v_to_team uuid;
  v_from_mgr uuid;
  v_to_mgr uuid;
BEGIN
  IF _from IS NULL OR _to IS NULL OR _from = _to THEN RETURN false; END IF;
  SELECT role::text INTO v_from_role FROM public.user_roles WHERE user_id = _from LIMIT 1;
  SELECT role::text INTO v_to_role FROM public.user_roles WHERE user_id = _to LIMIT 1;
  -- Admin always allowed, everyone can always message admin
  IF v_from_role = 'admin' OR v_to_role = 'admin' THEN RETURN true; END IF;

  -- Check blocks
  SELECT * INTO v_block FROM public.chat_user_blocks WHERE blocked_user_id = _to;
  IF FOUND THEN
    IF NOT (_from = ANY(v_block.except_user_ids)) THEN RETURN false; END IF;
  END IF;

  SELECT * INTO v_policy FROM public.chat_global_policy WHERE id = 1;
  IF NOT FOUND OR v_policy.all_users_mode = 'anyone' THEN RETURN true; END IF;

  SELECT department_id, team_id, manager_id INTO v_from_dept, v_from_team, v_from_mgr FROM public.profiles WHERE id = _from;
  SELECT department_id, team_id, manager_id INTO v_to_dept, v_to_team, v_to_mgr FROM public.profiles WHERE id = _to;

  IF v_policy.allow_managers AND (v_from_mgr = _to OR v_to_mgr = _from) THEN RETURN true; END IF;
  IF v_policy.allow_same_department AND v_from_dept IS NOT NULL AND v_from_dept = v_to_dept THEN RETURN true; END IF;
  IF v_policy.allow_same_team AND v_from_team IS NOT NULL AND v_from_team = v_to_team THEN RETURN true; END IF;

  RETURN false;
END;
$$;
GRANT EXECUTE ON FUNCTION public.can_message(uuid, uuid) TO authenticated;

-- 6. Seed candidate_offer SMS template
INSERT INTO public.sms_templates (key, name, body, variables, is_active) VALUES
  ('candidate_offer', 'Candidate Offer', 'Hi {{name}}, congratulations! You have been offered the {{position}} role at FDL. Please review and sign your contract here: {{link}}', '["name","position","link"]'::jsonb, true)
ON CONFLICT (key) DO NOTHING;
