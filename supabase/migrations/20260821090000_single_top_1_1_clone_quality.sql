-- Collapse product_qualities to a single fixed quality: Top 1:1 Clone.

INSERT INTO public.product_qualities (product_id, quality, price, compare_at_price)
SELECT source.product_id, 'Top 1:1 Clone', source.price, source.compare_at_price
FROM (
  SELECT DISTINCT ON (product_id)
    product_id,
    price,
    compare_at_price
  FROM public.product_qualities
  ORDER BY
    product_id,
    CASE quality
      WHEN 'Top 1:1 Clone' THEN 0
      WHEN '5A Clone' THEN 1
      WHEN '1:1 Clone' THEN 2
      ELSE 3
    END
) AS source
WHERE NOT EXISTS (
  SELECT 1
  FROM public.product_qualities AS existing
  WHERE existing.product_id = source.product_id
    AND existing.quality = 'Top 1:1 Clone'
);

DELETE FROM public.product_qualities
WHERE quality <> 'Top 1:1 Clone';

ALTER TABLE public.product_qualities
  DROP CONSTRAINT product_qualities_quality_allowed;

ALTER TABLE public.product_qualities
  ADD CONSTRAINT product_qualities_quality_allowed
    CHECK (quality = 'Top 1:1 Clone');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'product_qualities_one_per_product'
      AND conrelid = 'public.product_qualities'::regclass
  ) THEN
    ALTER TABLE public.product_qualities
      ADD CONSTRAINT product_qualities_one_per_product UNIQUE (product_id);
  END IF;
END $$;
