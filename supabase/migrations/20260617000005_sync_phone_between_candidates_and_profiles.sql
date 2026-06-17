-- Keeps phone numbers in sync between candidates and profiles.
-- • Writing phone on candidates  → profiles.phone updated automatically
-- • Writing phone on profiles    → candidates.phone updated automatically (if a candidate record exists)
-- Both triggers guard against infinite loops with a NULL-safe equality check.

-- ────────────────────────────────────────────────
-- 1. candidates → profiles
-- ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_phone_candidates_to_profiles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only proceed when phone actually changed
  IF NEW.phone IS NOT DISTINCT FROM OLD.phone THEN
    RETURN NEW;
  END IF;

  UPDATE public.profiles
  SET    phone      = NEW.phone,
         updated_at = now()
  WHERE  id = NEW.user_id
    AND  phone IS DISTINCT FROM NEW.phone;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_phone_candidates_to_profiles
AFTER INSERT OR UPDATE OF phone ON public.candidates
FOR EACH ROW
EXECUTE FUNCTION public.sync_phone_candidates_to_profiles();

-- ────────────────────────────────────────────────
-- 2. profiles → candidates
-- ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sync_phone_profiles_to_candidates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.phone IS NOT DISTINCT FROM OLD.phone THEN
    RETURN NEW;
  END IF;

  UPDATE public.candidates
  SET    phone      = NEW.phone,
         updated_at = now()
  WHERE  user_id = NEW.id
    AND  phone IS DISTINCT FROM NEW.phone;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_phone_profiles_to_candidates
AFTER INSERT OR UPDATE OF phone ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_phone_profiles_to_candidates();

-- ────────────────────────────────────────────────
-- 3. Back-fill: copy existing candidate phones
--    into profiles where profiles.phone is NULL.
-- ────────────────────────────────────────────────
UPDATE public.profiles p
SET    phone      = c.phone,
       updated_at = now()
FROM   public.candidates c
WHERE  c.user_id  = p.id
  AND  c.phone    IS NOT NULL
  AND  c.phone    <> ''
  AND  (p.phone IS NULL OR p.phone = '');
