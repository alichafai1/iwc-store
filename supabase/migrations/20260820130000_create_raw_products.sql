-- Internal publishing workflow: raw scraped product payloads.
-- Not storefront catalog data. No anonymous access.

CREATE TYPE public.scrape_status AS ENUM (
  'pending',
  'scraped',
  'failed',
  'processed'
);

CREATE TABLE public.raw_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url text NOT NULL,
  source_domain text,
  source_title text,
  source_description text,
  source_price numeric(12, 2),
  source_currency text,
  source_breadcrumbs jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_specifications jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_features jsonb NOT NULL DEFAULT '[]'::jsonb,
  raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  scrape_status public.scrape_status NOT NULL DEFAULT 'pending',
  error_message text,
  scraped_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT raw_products_source_url_key UNIQUE (source_url),
  CONSTRAINT raw_products_source_url_http CHECK (source_url ~* '^https?://'),
  CONSTRAINT raw_products_breadcrumbs_array CHECK (jsonb_typeof(source_breadcrumbs) = 'array'),
  CONSTRAINT raw_products_specifications_array CHECK (jsonb_typeof(source_specifications) = 'array'),
  CONSTRAINT raw_products_features_array CHECK (jsonb_typeof(source_features) = 'array'),
  CONSTRAINT raw_products_raw_data_object CHECK (jsonb_typeof(raw_data) = 'object')
);

CREATE INDEX raw_products_scrape_status_idx ON public.raw_products (scrape_status);
CREATE INDEX raw_products_source_domain_idx ON public.raw_products (source_domain);
CREATE INDEX raw_products_scraped_at_idx ON public.raw_products (scraped_at DESC);

COMMENT ON TABLE public.raw_products IS
  'Raw scraped product payloads for the internal publishing workflow. Not used by the public storefront.';

CREATE TRIGGER raw_products_set_updated_at
  BEFORE UPDATE ON public.raw_products
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.raw_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_products FORCE ROW LEVEL SECURITY;

CREATE POLICY raw_products_admin_select
  ON public.raw_products
  FOR SELECT
  TO authenticated
  USING ((SELECT public.is_admin()));

REVOKE ALL ON TABLE public.raw_products FROM PUBLIC;
REVOKE ALL ON TABLE public.raw_products FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.raw_products FROM authenticated;
GRANT SELECT ON TABLE public.raw_products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.raw_products TO service_role;
