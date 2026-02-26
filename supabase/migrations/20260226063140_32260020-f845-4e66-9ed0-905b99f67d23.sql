
-- Website Sections (CMS content blocks)
CREATE TABLE public.website_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key text NOT NULL UNIQUE,
  title text DEFAULT '',
  subtitle text DEFAULT '',
  body text DEFAULT '',
  image_url text DEFAULT '',
  metadata jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid DEFAULT NULL
);
ALTER TABLE public.website_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read website sections" ON public.website_sections FOR SELECT USING (true);
CREATE POLICY "Admins can manage website sections" ON public.website_sections FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Services
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  short_description text DEFAULT '',
  description text DEFAULT '',
  image_url text DEFAULT '',
  icon text DEFAULT '',
  cta_type text DEFAULT 'quote',
  display_order int DEFAULT 0,
  is_published boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read published services" ON public.services FOR SELECT USING (is_published = true);
CREATE POLICY "Admins can manage services" ON public.services FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Events
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  short_description text DEFAULT '',
  description text DEFAULT '',
  image_url text DEFAULT '',
  gallery jsonb DEFAULT '[]'::jsonb,
  event_date timestamptz DEFAULT NULL,
  registration_url text DEFAULT '',
  is_published boolean DEFAULT true,
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read published events" ON public.events FOR SELECT USING (is_published = true);
CREATE POLICY "Admins can manage events" ON public.events FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Innovations
CREATE TABLE public.innovations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  short_description text DEFAULT '',
  description text DEFAULT '',
  image_url text DEFAULT '',
  is_published boolean DEFAULT true,
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.innovations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read published innovations" ON public.innovations FOR SELECT USING (is_published = true);
CREATE POLICY "Admins can manage innovations" ON public.innovations FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Gallery Items
CREATE TABLE public.gallery_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text DEFAULT '',
  category text DEFAULT 'general',
  media_url text NOT NULL,
  media_type text DEFAULT 'image',
  display_order int DEFAULT 0,
  is_published boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read published gallery" ON public.gallery_items FOR SELECT USING (is_published = true);
CREATE POLICY "Admins can manage gallery" ON public.gallery_items FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Blog Categories
CREATE TABLE public.blog_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read blog categories" ON public.blog_categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage blog categories" ON public.blog_categories FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Blog Tags
CREATE TABLE public.blog_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.blog_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read blog tags" ON public.blog_tags FOR SELECT USING (true);
CREATE POLICY "Admins can manage blog tags" ON public.blog_tags FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Blog Posts
CREATE TABLE public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  excerpt text DEFAULT '',
  body text DEFAULT '',
  featured_image text DEFAULT '',
  category_id uuid REFERENCES public.blog_categories(id) ON DELETE SET NULL,
  tags jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'draft',
  meta_title text DEFAULT '',
  meta_description text DEFAULT '',
  author_id uuid DEFAULT NULL,
  published_at timestamptz DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read published blog posts" ON public.blog_posts FOR SELECT USING (status = 'published');
CREATE POLICY "Admins can manage blog posts" ON public.blog_posts FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Contact Submissions
CREATE TABLE public.contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text DEFAULT '',
  subject text DEFAULT '',
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit contact" ON public.contact_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can read contact submissions" ON public.contact_submissions FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage contact submissions" ON public.contact_submissions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Partners
CREATE TABLE public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text DEFAULT '',
  website_url text DEFAULT '',
  display_order int DEFAULT 0,
  is_published boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read published partners" ON public.partners FOR SELECT USING (is_published = true);
CREATE POLICY "Admins can manage partners" ON public.partners FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Testimonials
CREATE TABLE public.testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name text NOT NULL,
  author_title text DEFAULT '',
  author_image text DEFAULT '',
  quote text NOT NULL,
  display_order int DEFAULT 0,
  is_published boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read published testimonials" ON public.testimonials FOR SELECT USING (is_published = true);
CREATE POLICY "Admins can manage testimonials" ON public.testimonials FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
