-- Fix conflicting RLS policies on user_capabilities.
-- Multiple migrations created policies with duplicate names, which caused
-- some policies to be silently skipped, leaving employees unable to read
-- their own capability rows.

-- Drop all existing policies on this table
DROP POLICY IF EXISTS "Admins can view all capabilities"    ON public.user_capabilities;
DROP POLICY IF EXISTS "Admins can insert capabilities"      ON public.user_capabilities;
DROP POLICY IF EXISTS "Admins can update capabilities"      ON public.user_capabilities;
DROP POLICY IF EXISTS "Admins can delete capabilities"      ON public.user_capabilities;
DROP POLICY IF EXISTS "Users can view own capabilities"     ON public.user_capabilities;
DROP POLICY IF EXISTS "Users can read own capabilities"     ON public.user_capabilities;
DROP POLICY IF EXISTS "Admins can manage capabilities"      ON public.user_capabilities;

-- Recreate clean, non-overlapping policies

-- Authenticated users can always read their own capability rows
CREATE POLICY "Users can read own capabilities"
ON public.user_capabilities
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins can read all capability rows
CREATE POLICY "Admins can read all capabilities"
ON public.user_capabilities
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can insert, update, delete any capability rows
CREATE POLICY "Admins can manage capabilities"
ON public.user_capabilities
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
