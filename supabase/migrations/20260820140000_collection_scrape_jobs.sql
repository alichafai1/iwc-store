-- Collection scrape jobs and extra source-architecture fields on raw_products.
-- Phase 1 only: no catalog/product table writes.

CREATE TYPE public.scrape_job_status AS ENUM (
  'pending',
  'running',
  'completed',
  'failed'
);

CREATE TABLE public.scrape_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_collection_url text NOT NULL,
  source_collection_name text,
  source_domain text,
  products_discovered integer NOT NULL DEFAULT 0,
  products_completed integer NOT NULL DEFAULT 0,
  products_failed integer NOT NULL DEFAULT 0,
  job_status public.scrape_job_status NOT NULL DEFAULT 'pending',
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scrape_jobs_collection_url_http CHECK (source_collection_url ~* '^https?://'),
  CONSTRAINT scrape_jobs_counts_nonnegative CHECK (
    products_discovered >= 0
    AND products_completed >= 0
    AND products_failed >= 0
  )
);

CREATE INDEX scrape_jobs_created_at_idx ON public.scrape_jobs (created_at DESC);
CREATE INDEX scrape_jobs_job_status_idx ON public.scrape_jobs (job_status);
CREATE INDEX scrape_jobs_source_collection_url_idx ON public.scrape_jobs (source_collection_url);

COMMENT ON TABLE public.scrape_jobs IS
  'Internal collection scrape jobs for the product publishing workflow. Not used by the public storefront.';

CREATE TRIGGER scrape_jobs_set_updated_at
  BEFORE UPDATE ON public.scrape_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.scrape_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scrape_jobs FORCE ROW LEVEL SECURITY;

CREATE POLICY scrape_jobs_admin_select
  ON public.scrape_jobs
  FOR SELECT
  TO authenticated
  USING ((SELECT public.is_admin()));

REVOKE ALL ON TABLE public.scrape_jobs FROM PUBLIC;
REVOKE ALL ON TABLE public.scrape_jobs FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.scrape_jobs FROM authenticated;
GRANT SELECT ON TABLE public.scrape_jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.scrape_jobs TO service_role;

ALTER TABLE public.raw_products
  ADD COLUMN scrape_job_id uuid,
  ADD COLUMN source_collection_url text,
  ADD COLUMN source_collection_name text,
  ADD COLUMN source_model text,
  ADD COLUMN source_brand text,
  ADD COLUMN source_category text,
  ADD COLUMN source_primary_specs jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN source_additional_information jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.raw_products
  ADD CONSTRAINT raw_products_scrape_job_id_fkey
    FOREIGN KEY (scrape_job_id) REFERENCES public.scrape_jobs (id) ON DELETE SET NULL,
  ADD CONSTRAINT raw_products_collection_url_http
    CHECK (source_collection_url IS NULL OR source_collection_url ~* '^https?://'),
  ADD CONSTRAINT raw_products_primary_specs_array
    CHECK (jsonb_typeof(source_primary_specs) = 'array'),
  ADD CONSTRAINT raw_products_additional_information_array
    CHECK (jsonb_typeof(source_additional_information) = 'array');

CREATE INDEX raw_products_scrape_job_id_idx ON public.raw_products (scrape_job_id);
CREATE INDEX raw_products_source_collection_url_idx ON public.raw_products (source_collection_url);
