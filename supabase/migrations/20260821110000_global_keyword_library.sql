-- Global Keyword Library for the future GPT Product Processor.
-- Internal /admin data only. Does not change catalog, scrape, or workflow tables.

CREATE OR REPLACE FUNCTION public.normalize_keyword(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT NULLIF(regexp_replace(lower(btrim(value)), '\s+', ' ', 'g'), '');
$$;

COMMENT ON FUNCTION public.normalize_keyword(text) IS
  'Trims whitespace, lowercases, and collapses repeated spaces for keyword deduplication.';

REVOKE ALL ON FUNCTION public.normalize_keyword(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.normalize_keyword(text) TO authenticated, service_role;

CREATE TABLE public.keyword_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  file_type text NOT NULL,
  total_rows integer NOT NULL DEFAULT 0,
  imported_rows integer NOT NULL DEFAULT 0,
  duplicate_rows integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT keyword_imports_file_name_present CHECK (btrim(file_name) <> ''),
  CONSTRAINT keyword_imports_file_type_present CHECK (btrim(file_type) <> ''),
  CONSTRAINT keyword_imports_status_allowed CHECK (
    status IN ('pending', 'processing', 'completed', 'failed')
  ),
  CONSTRAINT keyword_imports_counts_nonnegative CHECK (
    total_rows >= 0
    AND imported_rows >= 0
    AND duplicate_rows >= 0
  )
);

CREATE INDEX keyword_imports_status_idx ON public.keyword_imports (status);
CREATE INDEX keyword_imports_created_at_idx ON public.keyword_imports (created_at DESC);
CREATE INDEX keyword_imports_created_by_idx ON public.keyword_imports (created_by);

COMMENT ON TABLE public.keyword_imports IS
  'Tracks each keyword file upload for the Global Keyword Library. Internal /admin use only.';

CREATE TABLE public.keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword text NOT NULL,
  normalized_keyword text GENERATED ALWAYS AS (public.normalize_keyword(keyword)) STORED,
  search_volume numeric,
  keyword_difficulty numeric,
  intent text,
  cpc numeric,
  "position" numeric,
  source_import_id uuid REFERENCES public.keyword_imports (id) ON DELETE SET NULL,
  raw_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT keywords_keyword_present CHECK (btrim(keyword) <> ''),
  CONSTRAINT keywords_normalized_keyword_present CHECK (normalized_keyword IS NOT NULL),
  CONSTRAINT keywords_normalized_keyword_key UNIQUE (normalized_keyword),
  CONSTRAINT keywords_raw_metrics_object CHECK (jsonb_typeof(raw_metrics) = 'object')
);

CREATE INDEX keywords_source_import_id_idx ON public.keywords (source_import_id);
CREATE INDEX keywords_created_at_idx ON public.keywords (created_at DESC);
CREATE INDEX keywords_intent_idx ON public.keywords (intent);

COMMENT ON TABLE public.keywords IS
  'Global keyword library shared by all collections and products. Metrics are optional. Internal /admin use only.';

COMMENT ON COLUMN public.keywords.raw_metrics IS
  'Unknown or tool-specific metric columns from CSV/XLSX imports. Do not require a schema change per SEO tool.';

CREATE TRIGGER keywords_set_updated_at
  BEFORE UPDATE ON public.keywords
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.upsert_global_keyword(
  p_keyword text,
  p_search_volume numeric DEFAULT NULL,
  p_keyword_difficulty numeric DEFAULT NULL,
  p_intent text DEFAULT NULL,
  p_cpc numeric DEFAULT NULL,
  p_position numeric DEFAULT NULL,
  p_source_import_id uuid DEFAULT NULL,
  p_raw_metrics jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  result_id uuid;
BEGIN
  INSERT INTO public.keywords (
    keyword,
    search_volume,
    keyword_difficulty,
    intent,
    cpc,
    "position",
    source_import_id,
    raw_metrics
  )
  VALUES (
    p_keyword,
    p_search_volume,
    p_keyword_difficulty,
    NULLIF(btrim(p_intent), ''),
    p_cpc,
    p_position,
    p_source_import_id,
    COALESCE(p_raw_metrics, '{}'::jsonb)
  )
  ON CONFLICT (normalized_keyword) DO UPDATE SET
    search_volume = COALESCE(EXCLUDED.search_volume, public.keywords.search_volume),
    keyword_difficulty = COALESCE(EXCLUDED.keyword_difficulty, public.keywords.keyword_difficulty),
    intent = COALESCE(EXCLUDED.intent, public.keywords.intent),
    cpc = COALESCE(EXCLUDED.cpc, public.keywords.cpc),
    "position" = COALESCE(EXCLUDED."position", public.keywords."position"),
    source_import_id = COALESCE(public.keywords.source_import_id, EXCLUDED.source_import_id),
    raw_metrics = COALESCE(public.keywords.raw_metrics, '{}'::jsonb)
      || COALESCE(EXCLUDED.raw_metrics, '{}'::jsonb)
  RETURNING id INTO result_id;

  RETURN result_id;
END;
$$;

COMMENT ON FUNCTION public.upsert_global_keyword IS
  'Inserts a global keyword or merges metrics into the existing normalized row. Null metrics never overwrite stored values.';

REVOKE ALL ON FUNCTION public.upsert_global_keyword(
  text, numeric, numeric, text, numeric, numeric, uuid, jsonb
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_global_keyword(
  text, numeric, numeric, text, numeric, numeric, uuid, jsonb
) TO authenticated, service_role;

ALTER TABLE public.keyword_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keyword_imports FORCE ROW LEVEL SECURITY;
ALTER TABLE public.keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keywords FORCE ROW LEVEL SECURITY;

CREATE POLICY keyword_imports_admin_select
  ON public.keyword_imports
  FOR SELECT
  TO authenticated
  USING ((SELECT public.is_admin()));

CREATE POLICY keyword_imports_admin_insert
  ON public.keyword_imports
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY keyword_imports_admin_update
  ON public.keyword_imports
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY keyword_imports_admin_delete
  ON public.keyword_imports
  FOR DELETE
  TO authenticated
  USING ((SELECT public.is_admin()));

CREATE POLICY keywords_admin_select
  ON public.keywords
  FOR SELECT
  TO authenticated
  USING ((SELECT public.is_admin()));

CREATE POLICY keywords_admin_insert
  ON public.keywords
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY keywords_admin_update
  ON public.keywords
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY keywords_admin_delete
  ON public.keywords
  FOR DELETE
  TO authenticated
  USING ((SELECT public.is_admin()));

REVOKE ALL ON TABLE public.keyword_imports FROM PUBLIC;
REVOKE ALL ON TABLE public.keyword_imports FROM anon;
REVOKE ALL ON TABLE public.keyword_imports FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.keyword_imports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.keyword_imports TO service_role;

REVOKE ALL ON TABLE public.keywords FROM PUBLIC;
REVOKE ALL ON TABLE public.keywords FROM anon;
REVOKE ALL ON TABLE public.keywords FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.keywords TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.keywords TO service_role;
