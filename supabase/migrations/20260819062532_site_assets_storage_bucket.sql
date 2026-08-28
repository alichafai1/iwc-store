-- Public website design assets (homepage, trust, gallery, icons, banners).
-- Known object URLs are readable without a SELECT policy because the bucket is public.
-- Admin SELECT is required for upsert (INSERT + SELECT + UPDATE).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'site-assets',
  'site-assets',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
);

CREATE POLICY site_assets_admin_select
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'site-assets'
    AND (SELECT public.is_admin())
  );

CREATE POLICY site_assets_admin_insert
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'site-assets'
    AND (SELECT public.is_admin())
  );

CREATE POLICY site_assets_admin_update
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'site-assets'
    AND (SELECT public.is_admin())
  )
  WITH CHECK (
    bucket_id = 'site-assets'
    AND (SELECT public.is_admin())
  );

CREATE POLICY site_assets_admin_delete
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'site-assets'
    AND (SELECT public.is_admin())
  );
