-- Collection SEO architecture: storefront fields, future SEO sections, keyword mapping.
-- Does not seed or generate copy.

ALTER TABLE public.collections
  ADD COLUMN seo_intro text,
  ADD COLUMN about_content text;

COMMENT ON COLUMN public.collections.seo_intro IS
  'Optional collection page intro. Storefront prefers this over description. Leave empty until SEO copy is written.';

COMMENT ON COLUMN public.collections.about_content IS
  'Optional collection about section. Storefront prefers this over seo_content. Leave empty until SEO copy is written.';

-- ---------------------------------------------------------------------------
-- Features
-- ---------------------------------------------------------------------------

CREATE TABLE public.collection_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES public.collections (id) ON DELETE CASCADE,
  feature_text text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT collection_features_feature_text_present CHECK (btrim(feature_text) <> '')
);

CREATE INDEX collection_features_collection_id_idx
  ON public.collection_features (collection_id);
CREATE INDEX collection_features_position_idx
  ON public.collection_features (collection_id, position);

CREATE TRIGGER collection_features_set_updated_at
  BEFORE UPDATE ON public.collection_features
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.collection_features IS
  'Optional collection feature bullets for future SEO copy. Empty until content is written.';

-- ---------------------------------------------------------------------------
-- FAQs
-- ---------------------------------------------------------------------------

CREATE TABLE public.collection_faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES public.collections (id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT collection_faqs_question_present CHECK (btrim(question) <> ''),
  CONSTRAINT collection_faqs_answer_present CHECK (btrim(answer) <> '')
);

CREATE INDEX collection_faqs_collection_id_idx
  ON public.collection_faqs (collection_id);
CREATE INDEX collection_faqs_position_idx
  ON public.collection_faqs (collection_id, position);

CREATE TRIGGER collection_faqs_set_updated_at
  BEFORE UPDATE ON public.collection_faqs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.collection_faqs IS
  'Optional collection FAQs for future SEO copy. Empty until content is written.';

-- ---------------------------------------------------------------------------
-- Related collections
-- ---------------------------------------------------------------------------

CREATE TABLE public.collection_related_collections (
  collection_id uuid NOT NULL REFERENCES public.collections (id) ON DELETE CASCADE,
  related_collection_id uuid NOT NULL REFERENCES public.collections (id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  PRIMARY KEY (collection_id, related_collection_id),
  CONSTRAINT collection_related_collections_not_self CHECK (collection_id <> related_collection_id)
);

CREATE INDEX collection_related_collections_related_id_idx
  ON public.collection_related_collections (related_collection_id);
CREATE INDEX collection_related_collections_position_idx
  ON public.collection_related_collections (collection_id, position);

COMMENT ON TABLE public.collection_related_collections IS
  'Optional related-collection links for future internal linking. Empty until mapped.';

-- ---------------------------------------------------------------------------
-- Popular models
-- ---------------------------------------------------------------------------

CREATE TABLE public.collection_popular_models (
  collection_id uuid NOT NULL REFERENCES public.collections (id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  PRIMARY KEY (collection_id, product_id)
);

CREATE INDEX collection_popular_models_product_id_idx
  ON public.collection_popular_models (product_id);
CREATE INDEX collection_popular_models_position_idx
  ON public.collection_popular_models (collection_id, position);

COMMENT ON TABLE public.collection_popular_models IS
  'Optional popular-model product links for future collection SEO. Empty until mapped.';

-- ---------------------------------------------------------------------------
-- Keyword mapping (admin / future generation only)
-- ---------------------------------------------------------------------------

CREATE TABLE public.collection_keywords (
  collection_id uuid NOT NULL REFERENCES public.collections (id) ON DELETE CASCADE,
  keyword_id uuid NOT NULL REFERENCES public.keywords (id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'supporting',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_id, keyword_id),
  CONSTRAINT collection_keywords_role_allowed CHECK (
    role IN ('primary', 'secondary', 'supporting')
  )
);

CREATE INDEX collection_keywords_keyword_id_idx
  ON public.collection_keywords (keyword_id);
CREATE INDEX collection_keywords_position_idx
  ON public.collection_keywords (collection_id, position);
CREATE INDEX collection_keywords_role_idx
  ON public.collection_keywords (collection_id, role);

CREATE TRIGGER collection_keywords_set_updated_at
  BEFORE UPDATE ON public.collection_keywords
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.collection_keywords IS
  'Maps global keyword-library rows to collections for future SEO generation. Internal /admin use only.';

COMMENT ON COLUMN public.collection_keywords.role IS
  'Keyword role for future generation: primary, secondary, or supporting.';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.collection_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_features FORCE ROW LEVEL SECURITY;
ALTER TABLE public.collection_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_faqs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.collection_related_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_related_collections FORCE ROW LEVEL SECURITY;
ALTER TABLE public.collection_popular_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_popular_models FORCE ROW LEVEL SECURITY;
ALTER TABLE public.collection_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_keywords FORCE ROW LEVEL SECURITY;

CREATE POLICY collection_features_public_select
  ON public.collection_features
  FOR SELECT
  TO anon, authenticated
  USING (
    (SELECT public.is_admin())
    OR EXISTS (
      SELECT 1
      FROM public.collections AS collections
      WHERE collections.id = collection_features.collection_id
        AND collections.status = 'published'
    )
  );

CREATE POLICY collection_features_admin_insert
  ON public.collection_features
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY collection_features_admin_update
  ON public.collection_features
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY collection_features_admin_delete
  ON public.collection_features
  FOR DELETE
  TO authenticated
  USING ((SELECT public.is_admin()));

CREATE POLICY collection_faqs_public_select
  ON public.collection_faqs
  FOR SELECT
  TO anon, authenticated
  USING (
    (SELECT public.is_admin())
    OR EXISTS (
      SELECT 1
      FROM public.collections AS collections
      WHERE collections.id = collection_faqs.collection_id
        AND collections.status = 'published'
    )
  );

CREATE POLICY collection_faqs_admin_insert
  ON public.collection_faqs
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY collection_faqs_admin_update
  ON public.collection_faqs
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY collection_faqs_admin_delete
  ON public.collection_faqs
  FOR DELETE
  TO authenticated
  USING ((SELECT public.is_admin()));

CREATE POLICY collection_related_collections_public_select
  ON public.collection_related_collections
  FOR SELECT
  TO anon, authenticated
  USING (
    (SELECT public.is_admin())
    OR (
      EXISTS (
        SELECT 1
        FROM public.collections AS collections
        WHERE collections.id = collection_related_collections.collection_id
          AND collections.status = 'published'
      )
      AND EXISTS (
        SELECT 1
        FROM public.collections AS related
        WHERE related.id = collection_related_collections.related_collection_id
          AND related.status = 'published'
      )
    )
  );

CREATE POLICY collection_related_collections_admin_insert
  ON public.collection_related_collections
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY collection_related_collections_admin_update
  ON public.collection_related_collections
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY collection_related_collections_admin_delete
  ON public.collection_related_collections
  FOR DELETE
  TO authenticated
  USING ((SELECT public.is_admin()));

CREATE POLICY collection_popular_models_public_select
  ON public.collection_popular_models
  FOR SELECT
  TO anon, authenticated
  USING (
    (SELECT public.is_admin())
    OR (
      EXISTS (
        SELECT 1
        FROM public.collections AS collections
        WHERE collections.id = collection_popular_models.collection_id
          AND collections.status = 'published'
      )
      AND EXISTS (
        SELECT 1
        FROM public.products AS products
        WHERE products.id = collection_popular_models.product_id
          AND products.status = 'published'
      )
    )
  );

CREATE POLICY collection_popular_models_admin_insert
  ON public.collection_popular_models
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY collection_popular_models_admin_update
  ON public.collection_popular_models
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY collection_popular_models_admin_delete
  ON public.collection_popular_models
  FOR DELETE
  TO authenticated
  USING ((SELECT public.is_admin()));

CREATE POLICY collection_keywords_admin_select
  ON public.collection_keywords
  FOR SELECT
  TO authenticated
  USING ((SELECT public.is_admin()));

CREATE POLICY collection_keywords_admin_insert
  ON public.collection_keywords
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY collection_keywords_admin_update
  ON public.collection_keywords
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY collection_keywords_admin_delete
  ON public.collection_keywords
  FOR DELETE
  TO authenticated
  USING ((SELECT public.is_admin()));

-- ---------------------------------------------------------------------------
-- Privileges
-- ---------------------------------------------------------------------------

GRANT SELECT ON TABLE
  public.collection_features,
  public.collection_faqs,
  public.collection_related_collections,
  public.collection_popular_models
TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.collection_features,
  public.collection_faqs,
  public.collection_related_collections,
  public.collection_popular_models
TO authenticated;

REVOKE ALL ON TABLE public.collection_keywords FROM PUBLIC;
REVOKE ALL ON TABLE public.collection_keywords FROM anon;
REVOKE ALL ON TABLE public.collection_keywords FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.collection_keywords TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.collection_keywords TO service_role;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE public.collection_keywords FROM authenticated, anon;
