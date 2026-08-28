-- Seed Aquatimer. Existing collection rows stay unchanged.
-- SEO copy stays empty except the required H1.

INSERT INTO public.collections (name, slug, status, published_at, h1)
VALUES
  ('Aquatimer', 'aquatimer', 'published', now(), 'IWC Aquatimer Replica Watches')
ON CONFLICT (slug) DO NOTHING;
