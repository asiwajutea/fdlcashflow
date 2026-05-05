
-- 1. Anon read for lookups on signup page
CREATE POLICY "Anon read active positions" ON public.positions FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Anon read active departments" ON public.departments FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Anon read active projects" ON public.projects FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "Anon read active teams" ON public.teams FOR SELECT TO anon USING (is_active = true);

-- 2. activity_forms first_step_name
ALTER TABLE public.activity_forms ADD COLUMN IF NOT EXISTS first_step_name text;

-- 3. profiles bank fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bank_name text,
  ADD COLUMN IF NOT EXISTS account_number text,
  ADD COLUMN IF NOT EXISTS account_name text;

-- 4. employees user/profile linking
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS profile_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS employees_user_id_unique ON public.employees(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS employees_profile_id_idx ON public.employees(profile_id);

-- Backfill user_id by email match
UPDATE public.employees e
SET user_id = u.id, profile_id = u.id
FROM auth.users u
WHERE e.user_id IS NULL
  AND e.email IS NOT NULL
  AND lower(e.email) = lower(u.email);

-- 5. invoices: SELECT for owning employee
CREATE POLICY "Employees can read own invoices"
ON public.invoices FOR SELECT TO authenticated
USING (employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid()));

-- 6. job_positions: capability-based management
DROP POLICY IF EXISTS "Admins can manage jobs" ON public.job_positions;
CREATE POLICY "Admins or capability can manage jobs"
ON public.job_positions FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR user_has_capability(auth.uid(), 'add_job_position'))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR user_has_capability(auth.uid(), 'add_job_position'));

-- 7. handle_new_user trigger update — auto-create employee row for new employees
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role text;
  v_status text;
  v_emp_id text;
  v_full_name text;
  v_designation text;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'employee');
  IF v_role IN ('candidate', 'admin') THEN
    v_status := 'approved';
  ELSE
    v_status := 'pending';
  END IF;

  INSERT INTO public.profiles (
    id, full_name, passcode, approval_status,
    birthday, gender, employee_id, phone, employment_start_date,
    position_id, department_id, project_id, team_id,
    passcode_acknowledged
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'passcode', '00000000'),
    v_status,
    NULLIF(NEW.raw_user_meta_data->>'birthday', '')::date,
    NEW.raw_user_meta_data->>'gender',
    NEW.raw_user_meta_data->>'employee_id',
    NEW.raw_user_meta_data->>'phone',
    NULLIF(NEW.raw_user_meta_data->>'employment_start_date', '')::date,
    NULLIF(NEW.raw_user_meta_data->>'position_id', '')::uuid,
    NULLIF(NEW.raw_user_meta_data->>'department_id', '')::uuid,
    NULLIF(NEW.raw_user_meta_data->>'project_id', '')::uuid,
    NULLIF(NEW.raw_user_meta_data->>'team_id', '')::uuid,
    CASE WHEN v_role = 'candidate' THEN true ELSE false END
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'employee'));

  IF v_role = 'candidate' THEN
    INSERT INTO public.user_capabilities (user_id, capability) VALUES
      (NEW.id, 'submit_application'),
      (NEW.id, 'complete_screening'),
      (NEW.id, 'view_interview'),
      (NEW.id, 'sign_contract'),
      (NEW.id, 'view_inbox'),
      (NEW.id, 'send_messages');
  END IF;

  -- Auto-create / link employee record for employees & admins
  IF v_role IN ('employee', 'admin') THEN
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
    v_emp_id := COALESCE(NULLIF(NEW.raw_user_meta_data->>'employee_id', ''), 'EMP-' || substr(NEW.id::text, 1, 8));
    SELECT name INTO v_designation FROM public.positions WHERE id = NULLIF(NEW.raw_user_meta_data->>'position_id', '')::uuid;

    -- If an employee already exists with the same email, just link it
    UPDATE public.employees
      SET user_id = NEW.id, profile_id = NEW.id
      WHERE user_id IS NULL AND lower(coalesce(email,'')) = lower(coalesce(NEW.email,''));

    -- Otherwise insert new
    IF NOT EXISTS (SELECT 1 FROM public.employees WHERE user_id = NEW.id) THEN
      INSERT INTO public.employees (employee_id, full_name, designation, email, user_id, profile_id)
      VALUES (v_emp_id, v_full_name, COALESCE(v_designation, ''), NEW.email, NEW.id, NEW.id);
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
