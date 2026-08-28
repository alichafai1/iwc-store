-- Seed Big Pilot and Top Gun. Existing collection rows stay unchanged.
-- SEO copy, FAQs, and internal links stay empty until they are written.

INSERT INTO public.collections (name, slug, status, published_at)
VALUES
  ('Big Pilot', 'big-pilot', 'published', now()),
  ('Top Gun', 'top-gun', 'published', now())
ON CONFLICT (slug) DO NOTHING;
