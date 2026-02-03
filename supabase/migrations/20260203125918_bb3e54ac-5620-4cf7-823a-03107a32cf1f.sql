-- 1. Add 'employee' to app_role enum
ALTER TYPE public.app_role ADD VALUE 'employee';

-- 2. Create user_capabilities table
CREATE TABLE public.user_capabilities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    capability text NOT NULL,
    granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (user_id, capability)
);

-- Enable RLS on user_capabilities
ALTER TABLE public.user_capabilities ENABLE ROW LEVEL SECURITY;

-- 3. Add created_by columns to data tables (nullable to preserve existing data)
ALTER TABLE public.weekly_records ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.daily_transactions ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.invoices ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.invoice_line_items ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 4. Update profiles table with full_name and is_active
ALTER TABLE public.profiles ADD COLUMN full_name text;
ALTER TABLE public.profiles ADD COLUMN is_active boolean DEFAULT true;

-- 5. Create security definer function for capability checking
CREATE OR REPLACE FUNCTION public.has_capability(_user_id uuid, _capability text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_capabilities
    WHERE user_id = _user_id AND capability = _capability
  )
$$;

-- 6. Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  )
$$;

-- 7. RLS policies for user_capabilities
-- Admins can manage all capabilities
CREATE POLICY "Admins can view all capabilities"
ON public.user_capabilities FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert capabilities"
ON public.user_capabilities FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update capabilities"
ON public.user_capabilities FOR UPDATE
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete capabilities"
ON public.user_capabilities FOR DELETE
USING (public.is_admin(auth.uid()));

-- Users can view their own capabilities
CREATE POLICY "Users can view own capabilities"
ON public.user_capabilities FOR SELECT
USING (auth.uid() = user_id);

-- 8. Update profiles policies - allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE
USING (public.is_admin(auth.uid()));