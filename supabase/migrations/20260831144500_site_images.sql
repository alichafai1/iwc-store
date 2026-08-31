-- Named site images (homepage hero, and later banners) stored in public site-assets.

CREATE TABLE public.site_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot text NOT NULL,
  storage_path text NOT NULL,
  alt text NOT NULL,
  width integer,
  height integer,
  status public.content_status NOT NULL DEFAULT 'published',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_images_slot_key UNIQUE (slot),
  CONSTRAINT site_images_storage_path_key UNIQUE (storage_path),
  CONSTRAINT site_images_slot_format CHECK (slot ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT site_images_width_positive CHECK (width IS NULL OR width > 0),
  CONSTRAINT site_images_height_positive CHECK (height IS NULL OR height > 0)
);

CREATE INDEX site_images_published_slot_idx
  ON public.site_images (slot)
  WHERE status = 'published';

CREATE TRIGGER site_images_set_updated_at
  BEFORE UPDATE ON public.site_images
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.site_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY site_images_public_select
  ON public.site_images
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published' OR (SELECT public.is_admin()));

CREATE POLICY site_images_admin_insert
  ON public.site_images
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY site_images_admin_update
  ON public.site_images
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY site_images_admin_delete
  ON public.site_images
  FOR DELETE
  TO authenticated
  USING ((SELECT public.is_admin()));

GRANT SELECT ON TABLE public.site_images TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.site_images
  TO authenticated;
