-- Ensure timestamp helper exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.kb_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT 'BookOpen',
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.kb_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage kb categories" ON public.kb_categories
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated read kb categories" ON public.kb_categories
  FOR SELECT TO authenticated USING (true);

CREATE TABLE public.kb_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  category_id UUID REFERENCES public.kb_categories(id) ON DELETE SET NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  summary TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  cover_image TEXT NOT NULL DEFAULT '',
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  view_count INT NOT NULL DEFAULT 0,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX kb_articles_search_idx ON public.kb_articles
  USING GIN (to_tsvector('english', title || ' ' || summary || ' ' || body));
CREATE INDEX kb_articles_status_idx ON public.kb_articles(status);
CREATE INDEX kb_articles_category_idx ON public.kb_articles(category_id);
ALTER TABLE public.kb_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage kb articles" ON public.kb_articles
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated read published kb articles" ON public.kb_articles
  FOR SELECT TO authenticated
  USING (
    status = 'published' AND (
      department_id IS NULL OR
      department_id IN (SELECT department_id FROM public.profiles WHERE id = auth.uid())
    )
  );
CREATE TRIGGER update_kb_articles_updated_at
  BEFORE UPDATE ON public.kb_articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cv_url TEXT,
  ADD COLUMN IF NOT EXISTS id_card_url TEXT;

INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('kb-attachments', 'kb-attachments', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users read own documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND (auth.uid()::text = (storage.foldername(name))[1] OR has_role(auth.uid(), 'admin'::app_role)));
CREATE POLICY "Users upload own documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own documents" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own documents" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public read kb attachments" ON storage.objects
  FOR SELECT USING (bucket_id = 'kb-attachments');
CREATE POLICY "Admins upload kb attachments" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'kb-attachments' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update kb attachments" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'kb-attachments' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete kb attachments" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'kb-attachments' AND has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.kb_categories (name, slug, description, icon, display_order) VALUES
  ('Getting Started', 'getting-started', 'Onboarding and orientation guides', 'Rocket', 1),
  ('HR & Policies', 'hr-policies', 'Company policies, leave, benefits', 'Users', 2),
  ('IT & Tools', 'it-tools', 'Software, accounts, troubleshooting', 'Laptop', 3),
  ('Field Operations', 'field-operations', 'Field work guides and SOPs', 'MapPin', 4),
  ('Finance', 'finance', 'Payslips, expense reporting, banking', 'Wallet', 5),
  ('Departments', 'departments', 'Department-specific resources', 'Building2', 6)
ON CONFLICT (slug) DO NOTHING;