-- Collection models guide, why-choose, and optional H1.
-- Empty until SEO copy is written. Does not change product workflow.

ALTER TABLE public.collections
  ADD COLUMN h1 text,
  ADD COLUMN models_guide_heading text,
  ADD COLUMN models_guide_content text,
  ADD COLUMN why_choose_heading text,
  ADD COLUMN why_choose_content text;

COMMENT ON COLUMN public.collections.h1 IS
  'Optional collection page H1. Storefront falls back to the collection name.';
COMMENT ON COLUMN public.collections.models_guide_heading IS
  'Optional H2 for the models guide section.';
COMMENT ON COLUMN public.collections.models_guide_content IS
  'Optional models guide body. Hidden on the storefront until filled.';
COMMENT ON COLUMN public.collections.why_choose_heading IS
  'Optional H2 for the why-choose section.';
COMMENT ON COLUMN public.collections.why_choose_content IS
  'Optional why-choose body. Hidden on the storefront until filled.';
