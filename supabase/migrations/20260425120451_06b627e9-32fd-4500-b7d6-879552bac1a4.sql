
-- Add columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS passcode_acknowledged boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS birthday date,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS employment_start_date date,
  ADD COLUMN IF NOT EXISTS employee_id text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS position_id uuid,
  ADD COLUMN IF NOT EXISTS department_id uuid,
  ADD COLUMN IF NOT EXISTS project_id uuid,
  ADD COLUMN IF NOT EXISTS team_id uuid;

-- Existing users (created before this migration) should be considered approved
UPDATE public.profiles SET approval_status = 'approved', passcode_acknowledged = true
WHERE approval_status = 'pending' AND passcode IS NOT NULL AND passcode <> '00000000';

-- Lookup tables
CREATE TABLE IF NOT EXISTS public.positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  description text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add FKs from profiles to lookups
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_position_fk,
  DROP CONSTRAINT IF EXISTS profiles_department_fk,
  DROP CONSTRAINT IF EXISTS profiles_project_fk,
  DROP CONSTRAINT IF EXISTS profiles_team_fk;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_position_fk FOREIGN KEY (position_id) REFERENCES public.positions(id) ON DELETE SET NULL,
  ADD CONSTRAINT profiles_department_fk FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL,
  ADD CONSTRAINT profiles_project_fk FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL,
  ADD CONSTRAINT profiles_team_fk FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;

-- RLS
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admins manage positions" ON public.positions FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Authenticated read positions" ON public.positions FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins manage departments" ON public.departments FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Authenticated read departments" ON public.departments FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins manage projects" ON public.projects FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Authenticated read projects" ON public.projects FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins manage teams" ON public.teams FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Authenticated read teams" ON public.teams FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Update handle_new_user trigger: employees become pending, candidates auto-approved
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role text;
  v_status text;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'employee');
  -- candidates and admins auto-approve; employees pending
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

  RETURN NEW;
END;
$function$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed defaults
INSERT INTO public.positions (name, description, display_order) VALUES
  ('Field Agent', 'Front-line field operations', 1),
  ('Field Manager', 'Manages field operations', 2),
  ('Data Entry Clerk', 'Data entry and processing', 3),
  ('QA Manager', 'Quality assurance', 4),
  ('Administrative Assistant', 'Office administration', 5)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.departments (name, description, display_order) VALUES
  ('Field Operations', 'On-the-ground operations', 1),
  ('Data & Analytics', 'Data processing and analysis', 2),
  ('Administration', 'Admin and HR', 3),
  ('Finance', 'Finance and accounting', 4)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.projects (name, description, display_order) VALUES
  ('General', 'Default project assignment', 1),
  ('Booklet Production', 'Booklet production project', 2)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.teams (name, description, display_order) VALUES
  ('Team A', 'General team A', 1),
  ('Team B', 'General team B', 2)
ON CONFLICT DO NOTHING;
