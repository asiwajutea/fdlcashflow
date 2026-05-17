CREATE UNIQUE INDEX IF NOT EXISTS blog_categories_slug_key ON public.blog_categories(slug);

INSERT INTO public.blog_categories (name, slug) VALUES
  ('EdTech', 'edtech'),
  ('Cultural Preservation', 'cultural-preservation'),
  ('Education', 'education'),
  ('Heritage', 'heritage'),
  ('Events', 'events'),
  ('Family History', 'family-history'),
  ('Innovation', 'innovation'),
  ('Community', 'community')
ON CONFLICT (slug) DO NOTHING;