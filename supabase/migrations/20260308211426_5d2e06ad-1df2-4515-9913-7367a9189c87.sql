-- Create custom_roles table for capability templates
CREATE TABLE public.custom_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text DEFAULT '',
  capabilities jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage custom roles"
ON public.custom_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can read
CREATE POLICY "Authenticated can read custom roles"
ON public.custom_roles FOR SELECT
TO authenticated
USING (true);