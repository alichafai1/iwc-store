-- Point Mark Series at the existing Anniversary Series collection image.
-- Reuse the storage path. Do not change other collection image rows.

UPDATE public.collections AS mark
SET
  image_path = anniversary.image_path,
  image_alt = 'IWC Mark Series replica watches collection cover showing an IWC replica watch in the Pilot Mark family'
FROM public.collections AS anniversary
WHERE mark.slug = 'mark-series'
  AND anniversary.slug = 'anniversary-series'
  AND anniversary.image_path IS NOT NULL;
