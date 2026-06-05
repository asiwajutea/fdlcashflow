
ALTER TABLE public.sms_logs
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_retry_at timestamptz,
  ADD COLUMN IF NOT EXISTS original_to text,
  ADD COLUMN IF NOT EXISTS original_template_key text,
  ADD COLUMN IF NOT EXISTS original_vars jsonb;

CREATE TABLE IF NOT EXISTS public.rate_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  bucket text NOT NULL CHECK (bucket IN ('income','expense')),
  unit text NOT NULL CHECK (unit IN ('per_name','monthly_fixed','percent')) DEFAULT 'per_name',
  value numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.rate_items TO authenticated;
GRANT ALL ON public.rate_items TO service_role;
ALTER TABLE public.rate_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read rate items" ON public.rate_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage rate items" ON public.rate_items FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER trg_rate_items_updated BEFORE UPDATE ON public.rate_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.finance_budgets
  ADD COLUMN IF NOT EXISTS kinds text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS category_ids uuid[] NOT NULL DEFAULT '{}';
UPDATE public.finance_budgets SET kinds = ARRAY[kind] WHERE coalesce(array_length(kinds,1),0)=0;
UPDATE public.finance_budgets SET category_ids = ARRAY[category_id] WHERE category_id IS NOT NULL AND coalesce(array_length(category_ids,1),0)=0;

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
    AND COALESCE(p.approval_status,'approved') = 'approved';
$$;
GRANT EXECUTE ON FUNCTION public.get_org_chart() TO authenticated;
