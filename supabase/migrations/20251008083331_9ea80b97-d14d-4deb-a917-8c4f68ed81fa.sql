-- Fix RLS policies to restrict access to admin users only

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Allow all operations on rate_configurations" ON public.rate_configurations;
DROP POLICY IF EXISTS "Allow all operations on weekly_records" ON public.weekly_records;
DROP POLICY IF EXISTS "Allow all operations on rate_change_history" ON public.rate_change_history;
DROP POLICY IF EXISTS "Allow all operations on ai_conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "Allow all operations on ai_messages" ON public.ai_messages;

-- Rate Configurations: Admin-only access
CREATE POLICY "Admins can view rate configurations"
ON public.rate_configurations
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert rate configurations"
ON public.rate_configurations
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update rate configurations"
ON public.rate_configurations
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete rate configurations"
ON public.rate_configurations
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Weekly Records: Admin-only access
CREATE POLICY "Admins can view weekly records"
ON public.weekly_records
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert weekly records"
ON public.weekly_records
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update weekly records"
ON public.weekly_records
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete weekly records"
ON public.weekly_records
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Rate Change History: Admin-only access
CREATE POLICY "Admins can view rate change history"
ON public.rate_change_history
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert rate change history"
ON public.rate_change_history
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- AI Conversations: Admin-only access
CREATE POLICY "Admins can view ai conversations"
ON public.ai_conversations
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert ai conversations"
ON public.ai_conversations
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update ai conversations"
ON public.ai_conversations
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete ai conversations"
ON public.ai_conversations
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- AI Messages: Admin-only access
CREATE POLICY "Admins can view ai messages"
ON public.ai_messages
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert ai messages"
ON public.ai_messages
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update ai messages"
ON public.ai_messages
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete ai messages"
ON public.ai_messages
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));