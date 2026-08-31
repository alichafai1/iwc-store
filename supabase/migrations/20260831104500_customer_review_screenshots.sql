-- WhatsApp customer-review screenshots shown on the homepage.
-- Files live in the public site-assets bucket.

CREATE TABLE public.customer_review_screenshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path text NOT NULL,
  alt text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  status public.content_status NOT NULL DEFAULT 'published',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_review_screenshots_storage_path_key UNIQUE (storage_path)
);

CREATE INDEX customer_review_screenshots_published_sort_idx
  ON public.customer_review_screenshots (sort_order)
  WHERE status = 'published';

CREATE TRIGGER customer_review_screenshots_set_updated_at
  BEFORE UPDATE ON public.customer_review_screenshots
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.customer_review_screenshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY customer_review_screenshots_public_select
  ON public.customer_review_screenshots
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published' OR (SELECT public.is_admin()));

CREATE POLICY customer_review_screenshots_admin_insert
  ON public.customer_review_screenshots
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY customer_review_screenshots_admin_update
  ON public.customer_review_screenshots
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY customer_review_screenshots_admin_delete
  ON public.customer_review_screenshots
  FOR DELETE
  TO authenticated
  USING ((SELECT public.is_admin()));

GRANT SELECT ON TABLE public.customer_review_screenshots TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.customer_review_screenshots
  TO authenticated;
