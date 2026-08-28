-- Product editor fields: about/details copy, review order, and key features.

ALTER TABLE public.products
  ADD COLUMN about_heading text,
  ADD COLUMN details_heading text,
  ADD COLUMN details_content text;

ALTER TABLE public.product_reviews
  ADD COLUMN position integer NOT NULL DEFAULT 0;

CREATE INDEX product_reviews_position_idx
  ON public.product_reviews (product_id, position);

CREATE TABLE public.product_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  feature_text text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX product_features_product_id_idx
  ON public.product_features (product_id);
CREATE INDEX product_features_position_idx
  ON public.product_features (product_id, position);

CREATE TRIGGER product_features_set_updated_at
  BEFORE UPDATE ON public.product_features
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.product_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_features FORCE ROW LEVEL SECURITY;

CREATE POLICY product_features_public_select
  ON public.product_features
  FOR SELECT
  TO anon, authenticated
  USING (
    (SELECT public.is_admin())
    OR EXISTS (
      SELECT 1
      FROM public.products AS products
      WHERE products.id = product_features.product_id
        AND products.status = 'published'
    )
  );

CREATE POLICY product_features_admin_insert
  ON public.product_features
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY product_features_admin_update
  ON public.product_features
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY product_features_admin_delete
  ON public.product_features
  FOR DELETE
  TO authenticated
  USING ((SELECT public.is_admin()));

GRANT SELECT ON TABLE public.product_features TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.product_features TO authenticated;
