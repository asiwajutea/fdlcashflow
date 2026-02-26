-- Hero slides table for CMS-editable homepage slideshow
CREATE TABLE public.hero_slides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  accent text NOT NULL DEFAULT '',
  subtitle text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '',
  display_order integer DEFAULT 0,
  is_published boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published slides" ON public.hero_slides
  FOR SELECT USING (is_published = true);

CREATE POLICY "Admins can manage slides" ON public.hero_slides
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed default hero slides with cinematic African-themed images
INSERT INTO public.hero_slides (title, accent, subtitle, image_url, display_order) VALUES
('Making a Difference', 'Across Industries', 'Delivering excellence in Events, Technology, Education, and Cultural Preservation.', 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1920&q=80', 1),
('Innovation That', 'Drives Impact', 'Pioneering solutions in EduTech, SaaS, and digital transformation.', 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1920&q=80', 2),
('Unforgettable', 'Events & Experiences', 'From MAQ7 to StreeTalentz — celebrating talent, culture, and community.', 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1920&q=80', 3),
('Building the', 'Next Generation', 'Education programs and cultural preservation for a brighter future.', 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1920&q=80', 4);