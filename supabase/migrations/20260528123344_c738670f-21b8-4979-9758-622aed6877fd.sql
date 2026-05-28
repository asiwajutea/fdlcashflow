
-- Sync profile -> employee
CREATE OR REPLACE FUNCTION public.sync_profile_to_employee()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_designation text;
  v_email text;
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;

  SELECT name INTO v_designation FROM public.positions WHERE id = NEW.position_id;
  SELECT email INTO v_email FROM auth.users WHERE id = NEW.id;

  UPDATE public.employees e
  SET
    full_name = COALESCE(NULLIF(NEW.full_name,''), e.full_name),
    bank_name = COALESCE(NULLIF(NEW.bank_name,''), e.bank_name),
    account_number = COALESCE(NULLIF(NEW.account_number,''), e.account_number),
    designation = COALESCE(NULLIF(v_designation,''), e.designation),
    email = COALESCE(NULLIF(v_email,''), e.email)
  WHERE e.user_id = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_to_employee ON public.profiles;
CREATE TRIGGER trg_sync_profile_to_employee
AFTER UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_to_employee();

-- Sync employee -> profile
CREATE OR REPLACE FUNCTION public.sync_employee_to_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;

  UPDATE public.profiles p
  SET
    full_name = COALESCE(NULLIF(NEW.full_name,''), p.full_name),
    bank_name = COALESCE(NULLIF(NEW.bank_name,''), p.bank_name),
    account_number = COALESCE(NULLIF(NEW.account_number,''), p.account_number)
  WHERE p.id = NEW.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_employee_to_profile ON public.employees;
CREATE TRIGGER trg_sync_employee_to_profile
AFTER UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.sync_employee_to_profile();

-- Backfill: profile -> employee
UPDATE public.employees e
SET
  full_name = COALESCE(NULLIF(p.full_name,''), e.full_name),
  bank_name = CASE WHEN COALESCE(e.bank_name,'') = '' THEN COALESCE(p.bank_name, e.bank_name) ELSE e.bank_name END,
  account_number = CASE WHEN COALESCE(e.account_number,'') = '' THEN COALESCE(p.account_number, e.account_number) ELSE e.account_number END,
  designation = CASE WHEN COALESCE(e.designation,'') = '' THEN COALESCE((SELECT name FROM public.positions WHERE id = p.position_id), e.designation) ELSE e.designation END
FROM public.profiles p
WHERE e.user_id = p.id;

-- Backfill: employee -> profile
UPDATE public.profiles p
SET
  bank_name = CASE WHEN COALESCE(p.bank_name,'') = '' THEN COALESCE(e.bank_name, p.bank_name) ELSE p.bank_name END,
  account_number = CASE WHEN COALESCE(p.account_number,'') = '' THEN COALESCE(e.account_number, p.account_number) ELSE p.account_number END,
  full_name = COALESCE(NULLIF(p.full_name,''), e.full_name)
FROM public.employees e
WHERE e.user_id = p.id;
