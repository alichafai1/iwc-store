-- Replace Anniversary Series in published storefront listings with Mark Series.
-- Keep the Anniversary Series row and all product relations.

UPDATE public.collections
SET status = 'archived'
WHERE slug = 'anniversary-series'
  AND status = 'published';

INSERT INTO public.collections (name, slug, status, published_at, h1)
VALUES
  ('Mark Series', 'mark-series', 'published', now(), 'IWC Mark Series Replica Watches')
ON CONFLICT (slug) DO NOTHING;
