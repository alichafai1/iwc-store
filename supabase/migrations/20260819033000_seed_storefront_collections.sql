-- Seed the storefront collections. Existing slugs stay unchanged.
-- Best Sellers and New Arrivals become real collection rows.

INSERT INTO public.collections (name, slug, status, published_at)
VALUES
  ('Da Vinci', 'da-vinci', 'published', now()),
  ('Ingenieur', 'ingenieur', 'published', now()),
  ('Anniversary Series', 'anniversary-series', 'published', now()),
  ('Pilots', 'pilots', 'published', now()),
  ('Portofino', 'portofino', 'published', now()),
  ('Portuguese', 'portuguese', 'published', now()),
  ('Spitfire', 'spitfire', 'published', now()),
  ('Best Sellers', 'best-sellers', 'published', now()),
  ('New Arrivals', 'new-arrivals', 'published', now())
ON CONFLICT (slug) DO NOTHING;
