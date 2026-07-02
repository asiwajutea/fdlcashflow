ALTER TABLE public.contract_templates ADD COLUMN IF NOT EXISTS pdf_url text NOT NULL DEFAULT '';
ALTER TABLE public.contract_templates ADD COLUMN IF NOT EXISTS header_html text NOT NULL DEFAULT '';
ALTER TABLE public.contract_templates ADD COLUMN IF NOT EXISTS footer_html text NOT NULL DEFAULT '';