-- Replace free-form product variants with a fixed 3-quality pricing model.
-- Drafts may omit prices (nullable). Publishing requires all 3 prices in the app.

CREATE TABLE public.product_qualities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  quality text NOT NULL,
  price numeric(12, 2),
  compare_at_price numeric(12, 2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_qualities_quality_allowed
    CHECK (quality IN ('5A Clone', '1:1 Clone', 'Top 1:1 Clone')),
  CONSTRAINT product_qualities_product_quality_unique UNIQUE (product_id, quality),
  CONSTRAINT product_qualities_price_nonnegative
    CHECK (price IS NULL OR price >= 0),
  CONSTRAINT product_qualities_compare_at_price_nonnegative
    CHECK (compare_at_price IS NULL OR compare_at_price >= 0)
);

CREATE TRIGGER product_qualities_set_updated_at
  BEFORE UPDATE ON public.product_qualities
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.product_qualities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_qualities FORCE ROW LEVEL SECURITY;

CREATE POLICY product_qualities_public_select
  ON public.product_qualities
  FOR SELECT
  TO anon, authenticated
  USING (
    (SELECT public.is_admin())
    OR EXISTS (
      SELECT 1
      FROM public.products AS products
      WHERE products.id = product_qualities.product_id
        AND products.status = 'published'
    )
  );

CREATE POLICY product_qualities_admin_insert
  ON public.product_qualities
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY product_qualities_admin_update
  ON public.product_qualities
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY product_qualities_admin_delete
  ON public.product_qualities
  FOR DELETE
  TO authenticated
  USING ((SELECT public.is_admin()));

GRANT SELECT ON TABLE public.product_qualities TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.product_qualities TO authenticated;

DROP TABLE public.product_variants;
