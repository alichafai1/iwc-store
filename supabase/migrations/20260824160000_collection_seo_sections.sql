-- Collection SEO sections: overview, history, buying guide, comparison,
-- contextual related links, internal link mapping, custom FAQ heading.
-- Does not seed or generate copy.

ALTER TABLE public.collections
  ADD COLUMN overview_content text,
  ADD COLUMN history_content text,
  ADD COLUMN buying_guide_content text,
  ADD COLUMN comparison_content text,
  ADD COLUMN related_intro text,
  ADD COLUMN faq_heading text;

COMMENT ON COLUMN public.collections.overview_content IS
  'Collection overview body. Storefront prefers this over about_content and seo_content.';
COMMENT ON COLUMN public.collections.history_content IS
  'History and design section body. Empty until SEO copy is written.';
COMMENT ON COLUMN public.collections.buying_guide_content IS
  'Buying guide section body. Empty until SEO copy is written.';
COMMENT ON COLUMN public.collections.comparison_content IS
  'Collection comparison intro body. Empty until SEO copy is written.';
COMMENT ON COLUMN public.collections.related_intro IS
  'Optional intro above related-collection contextual links.';
COMMENT ON COLUMN public.collections.faq_heading IS
  'Optional custom FAQ heading. Storefront falls back to Frequently Asked Questions.';

ALTER TABLE public.collection_related_collections
  ADD COLUMN anchor_text text,
  ADD COLUMN context text;

COMMENT ON COLUMN public.collection_related_collections.anchor_text IS
  'Optional contextual link label. Storefront falls back to the related collection name.';
COMMENT ON COLUMN public.collection_related_collections.context IS
  'Optional sentence or note shown with the related-collection link.';

CREATE TABLE public.collection_comparisons (
  collection_id uuid NOT NULL REFERENCES public.collections (id) ON DELETE CASCADE,
  compared_collection_id uuid NOT NULL REFERENCES public.collections (id) ON DELETE CASCADE,
  body text,
  position integer NOT NULL DEFAULT 0,
  PRIMARY KEY (collection_id, compared_collection_id),
  CONSTRAINT collection_comparisons_not_self CHECK (collection_id <> compared_collection_id)
);

CREATE INDEX collection_comparisons_compared_id_idx
  ON public.collection_comparisons (compared_collection_id);
CREATE INDEX collection_comparisons_position_idx
  ON public.collection_comparisons (collection_id, position);

COMMENT ON TABLE public.collection_comparisons IS
  'Optional compared collections for the collection comparison section. Empty until mapped.';

CREATE TABLE public.collection_internal_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES public.collections (id) ON DELETE CASCADE,
  label text NOT NULL,
  href text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT collection_internal_links_label_present CHECK (btrim(label) <> ''),
  CONSTRAINT collection_internal_links_href_internal CHECK (href ~ '^/([^/]|$)')
);

CREATE INDEX collection_internal_links_collection_id_idx
  ON public.collection_internal_links (collection_id);
CREATE INDEX collection_internal_links_position_idx
  ON public.collection_internal_links (collection_id, position);

CREATE TRIGGER collection_internal_links_set_updated_at
  BEFORE UPDATE ON public.collection_internal_links
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.collection_internal_links IS
  'Optional internal link map for collection SEO. Paths must be site-relative. Empty until mapped.';

ALTER TABLE public.collection_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_comparisons FORCE ROW LEVEL SECURITY;
ALTER TABLE public.collection_internal_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_internal_links FORCE ROW LEVEL SECURITY;

CREATE POLICY collection_comparisons_public_select
  ON public.collection_comparisons
  FOR SELECT
  TO anon, authenticated
  USING (
    (SELECT public.is_admin())
    OR (
      EXISTS (
        SELECT 1
        FROM public.collections AS collections
        WHERE collections.id = collection_comparisons.collection_id
          AND collections.status = 'published'
      )
      AND EXISTS (
        SELECT 1
        FROM public.collections AS compared
        WHERE compared.id = collection_comparisons.compared_collection_id
          AND compared.status = 'published'
      )
    )
  );

CREATE POLICY collection_comparisons_admin_insert
  ON public.collection_comparisons
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY collection_comparisons_admin_update
  ON public.collection_comparisons
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY collection_comparisons_admin_delete
  ON public.collection_comparisons
  FOR DELETE
  TO authenticated
  USING ((SELECT public.is_admin()));

CREATE POLICY collection_internal_links_public_select
  ON public.collection_internal_links
  FOR SELECT
  TO anon, authenticated
  USING (
    (SELECT public.is_admin())
    OR EXISTS (
      SELECT 1
      FROM public.collections AS collections
      WHERE collections.id = collection_internal_links.collection_id
        AND collections.status = 'published'
    )
  );

CREATE POLICY collection_internal_links_admin_insert
  ON public.collection_internal_links
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY collection_internal_links_admin_update
  ON public.collection_internal_links
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY collection_internal_links_admin_delete
  ON public.collection_internal_links
  FOR DELETE
  TO authenticated
  USING ((SELECT public.is_admin()));

GRANT SELECT ON TABLE
  public.collection_comparisons,
  public.collection_internal_links
TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.collection_comparisons,
  public.collection_internal_links
TO authenticated;
