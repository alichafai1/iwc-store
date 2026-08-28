-- Remove unused About Product details fields. Keep about_heading and description.

ALTER TABLE public.products
  DROP COLUMN IF EXISTS details_heading,
  DROP COLUMN IF EXISTS details_content;
