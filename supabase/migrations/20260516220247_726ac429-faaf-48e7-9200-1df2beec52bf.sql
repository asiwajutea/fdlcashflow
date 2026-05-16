ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS author_name text;
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS is_auto_generated boolean NOT NULL DEFAULT false;
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS sources jsonb DEFAULT '[]'::jsonb;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;