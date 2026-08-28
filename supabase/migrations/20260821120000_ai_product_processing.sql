-- Phase 2 automatic GPT product processing.
-- Internal /admin workflow only. Does not publish catalog rows or change storefront rendering.

CREATE TYPE public.ai_processing_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'completed_with_errors',
  'failed'
);

CREATE TYPE public.ai_product_run_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed'
);

CREATE TABLE public.ai_processing_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scrape_job_id uuid NOT NULL REFERENCES public.scrape_jobs (id) ON DELETE CASCADE,
  collection_url text NOT NULL,
  collection_name text,
  status public.ai_processing_status NOT NULL DEFAULT 'pending',
  total_products integer NOT NULL DEFAULT 0,
  processed_products integer NOT NULL DEFAULT 0,
  failed_products integer NOT NULL DEFAULT 0,
  keywords_evaluated integer NOT NULL DEFAULT 0,
  collection_keywords jsonb NOT NULL DEFAULT '[]'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_processing_jobs_scrape_job_id_key UNIQUE (scrape_job_id),
  CONSTRAINT ai_processing_jobs_collection_url_http CHECK (collection_url ~* '^https?://'),
  CONSTRAINT ai_processing_jobs_counts_nonnegative CHECK (
    total_products >= 0
    AND processed_products >= 0
    AND failed_products >= 0
    AND keywords_evaluated >= 0
  ),
  CONSTRAINT ai_processing_jobs_collection_keywords_array CHECK (
    jsonb_typeof(collection_keywords) = 'array'
  )
);

CREATE INDEX ai_processing_jobs_status_idx ON public.ai_processing_jobs (status);
CREATE INDEX ai_processing_jobs_created_at_idx ON public.ai_processing_jobs (created_at DESC);

COMMENT ON TABLE public.ai_processing_jobs IS
  'Collection-level GPT processing jobs. Internal /admin use only. Not used by the public storefront.';

CREATE TRIGGER ai_processing_jobs_set_updated_at
  BEFORE UPDATE ON public.ai_processing_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.ai_product_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processing_job_id uuid NOT NULL REFERENCES public.ai_processing_jobs (id) ON DELETE CASCADE,
  raw_product_id uuid NOT NULL REFERENCES public.raw_products (id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products (id) ON DELETE SET NULL,
  status public.ai_product_run_status NOT NULL DEFAULT 'pending',
  primary_keyword text,
  selected_keywords jsonb NOT NULL DEFAULT '[]'::jsonb,
  used_keywords jsonb NOT NULL DEFAULT '[]'::jsonb,
  unused_relevant_keywords jsonb NOT NULL DEFAULT '[]'::jsonb,
  coverage_percent numeric(5, 2),
  attempts integer NOT NULL DEFAULT 0,
  final_output jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT ai_product_runs_job_raw_unique UNIQUE (processing_job_id, raw_product_id),
  CONSTRAINT ai_product_runs_attempts_nonnegative CHECK (attempts >= 0),
  CONSTRAINT ai_product_runs_coverage_range CHECK (
    coverage_percent IS NULL
    OR (coverage_percent >= 0 AND coverage_percent <= 100)
  ),
  CONSTRAINT ai_product_runs_selected_keywords_array CHECK (jsonb_typeof(selected_keywords) = 'array'),
  CONSTRAINT ai_product_runs_used_keywords_array CHECK (jsonb_typeof(used_keywords) = 'array'),
  CONSTRAINT ai_product_runs_unused_keywords_array CHECK (jsonb_typeof(unused_relevant_keywords) = 'array'),
  CONSTRAINT ai_product_runs_final_output_object CHECK (jsonb_typeof(final_output) = 'object')
);

CREATE INDEX ai_product_runs_processing_job_id_idx ON public.ai_product_runs (processing_job_id);
CREATE INDEX ai_product_runs_raw_product_id_idx ON public.ai_product_runs (raw_product_id);
CREATE INDEX ai_product_runs_product_id_idx ON public.ai_product_runs (product_id);
CREATE INDEX ai_product_runs_status_idx ON public.ai_product_runs (status);

COMMENT ON TABLE public.ai_product_runs IS
  'Per-product GPT generation attempts for a collection processing job. Internal /admin use only.';

ALTER TABLE public.raw_products
  ADD COLUMN processed_product_id uuid REFERENCES public.products (id) ON DELETE SET NULL;

CREATE INDEX raw_products_processed_product_id_idx ON public.raw_products (processed_product_id);

COMMENT ON COLUMN public.raw_products.processed_product_id IS
  'Draft or catalog product created from this raw scrape. Prevents duplicate product rows on reprocessing.';

ALTER TABLE public.ai_processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_processing_jobs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.ai_product_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_product_runs FORCE ROW LEVEL SECURITY;

CREATE POLICY ai_processing_jobs_admin_select
  ON public.ai_processing_jobs
  FOR SELECT
  TO authenticated
  USING ((SELECT public.is_admin()));

CREATE POLICY ai_product_runs_admin_select
  ON public.ai_product_runs
  FOR SELECT
  TO authenticated
  USING ((SELECT public.is_admin()));

REVOKE ALL ON TABLE public.ai_processing_jobs FROM PUBLIC;
REVOKE ALL ON TABLE public.ai_processing_jobs FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.ai_processing_jobs FROM authenticated;
GRANT SELECT ON TABLE public.ai_processing_jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ai_processing_jobs TO service_role;

REVOKE ALL ON TABLE public.ai_product_runs FROM PUBLIC;
REVOKE ALL ON TABLE public.ai_product_runs FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.ai_product_runs FROM authenticated;
GRANT SELECT ON TABLE public.ai_product_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ai_product_runs TO service_role;
