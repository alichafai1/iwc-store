-- Initial ecommerce schema: catalog, editorial, admin, RLS, and public image storage.
-- Images are stored in Storage; PostgreSQL keeps only paths, alt text, and metadata.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

CREATE TYPE public.content_status AS ENUM ('draft', 'review', 'published', 'archived');
CREATE TYPE public.article_type AS ENUM ('blog', 'guide');

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.set_updated_at() IS
  'Keeps updated_at current on row updates.';

-- ---------------------------------------------------------------------------
-- Admin
-- ---------------------------------------------------------------------------

CREATE TABLE public.admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.admin_users IS
  'Allow-list of Auth users who may administer catalog and editorial content.';

-- SECURITY DEFINER is required so RLS on admin_users does not recurse.
-- The function only reports whether the current auth.uid() is an admin.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.admin_users AS admin_users
      WHERE admin_users.user_id = (SELECT auth.uid())
    );
$$;

COMMENT ON FUNCTION public.is_admin() IS
  'Returns true when auth.uid() exists in public.admin_users.';

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Collections
-- ---------------------------------------------------------------------------

CREATE TABLE public.collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  seo_content text,
  image_path text,
  image_alt text,
  meta_title text,
  meta_description text,
  status public.content_status NOT NULL DEFAULT 'draft',
  featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

CREATE INDEX collections_status_idx ON public.collections (status);
CREATE INDEX collections_published_at_idx ON public.collections (published_at);
CREATE INDEX collections_featured_idx ON public.collections (featured) WHERE featured;

CREATE TRIGGER collections_set_updated_at
  BEFORE UPDATE ON public.collections
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------------------

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_collection_id uuid REFERENCES public.collections (id) ON DELETE SET NULL,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  short_description text,
  description text,
  sku text,
  status public.content_status NOT NULL DEFAULT 'draft',
  featured boolean NOT NULL DEFAULT false,
  best_seller boolean NOT NULL DEFAULT false,
  meta_title text,
  meta_description text,
  canonical_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

CREATE INDEX products_primary_collection_id_idx ON public.products (primary_collection_id);
CREATE INDEX products_status_idx ON public.products (status);
CREATE INDEX products_published_at_idx ON public.products (published_at);
CREATE INDEX products_featured_idx ON public.products (featured) WHERE featured;
CREATE INDEX products_best_seller_idx ON public.products (best_seller) WHERE best_seller;

CREATE TRIGGER products_set_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.product_collections (
  product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  collection_id uuid NOT NULL REFERENCES public.collections (id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, collection_id)
);

CREATE INDEX product_collections_collection_id_idx
  ON public.product_collections (collection_id);
CREATE INDEX product_collections_position_idx
  ON public.product_collections (collection_id, position);

CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  name text NOT NULL,
  sku text,
  price numeric(12, 2) NOT NULL,
  compare_at_price numeric(12, 2),
  stock integer NOT NULL DEFAULT 0,
  position integer NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_variants_price_nonnegative CHECK (price >= 0),
  CONSTRAINT product_variants_compare_at_price_nonnegative CHECK (compare_at_price IS NULL OR compare_at_price >= 0),
  CONSTRAINT product_variants_stock_nonnegative CHECK (stock >= 0)
);

CREATE INDEX product_variants_product_id_idx ON public.product_variants (product_id);
CREATE INDEX product_variants_position_idx ON public.product_variants (product_id, position);
CREATE UNIQUE INDEX product_variants_one_default_idx
  ON public.product_variants (product_id)
  WHERE is_default;

CREATE TRIGGER product_variants_set_updated_at
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  alt_text text,
  position integer NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX product_images_product_id_idx ON public.product_images (product_id);
CREATE INDEX product_images_position_idx ON public.product_images (product_id, position);
CREATE UNIQUE INDEX product_images_one_primary_idx
  ON public.product_images (product_id)
  WHERE is_primary;

CREATE TABLE public.product_specs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  label text NOT NULL,
  value text NOT NULL,
  position integer NOT NULL DEFAULT 0
);

CREATE INDEX product_specs_product_id_idx ON public.product_specs (product_id);
CREATE INDEX product_specs_position_idx ON public.product_specs (product_id, position);

CREATE TABLE public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  title text NOT NULL,
  customer_name text NOT NULL,
  rating integer NOT NULL,
  review_text text NOT NULL,
  review_date date NOT NULL,
  status public.content_status NOT NULL DEFAULT 'published',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_reviews_rating_range CHECK (rating >= 1 AND rating <= 5)
);

CREATE INDEX product_reviews_product_id_idx ON public.product_reviews (product_id);
CREATE INDEX product_reviews_status_idx ON public.product_reviews (status);
CREATE INDEX product_reviews_review_date_idx ON public.product_reviews (product_id, review_date DESC);

CREATE TRIGGER product_reviews_set_updated_at
  BEFORE UPDATE ON public.product_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.product_faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX product_faqs_product_id_idx ON public.product_faqs (product_id);
CREATE INDEX product_faqs_position_idx ON public.product_faqs (product_id, position);

CREATE TRIGGER product_faqs_set_updated_at
  BEFORE UPDATE ON public.product_faqs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Authors
-- ---------------------------------------------------------------------------

CREATE TABLE public.authors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  bio text,
  image_path text,
  image_alt text,
  website_url text,
  instagram_url text,
  linkedin_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER authors_set_updated_at
  BEFORE UPDATE ON public.authors
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Articles (blogs + guides)
-- ---------------------------------------------------------------------------

CREATE TABLE public.articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.article_type NOT NULL,
  title text NOT NULL,
  slug text NOT NULL,
  category text,
  summary text,
  author_id uuid REFERENCES public.authors (id) ON DELETE SET NULL,
  hero_image_path text,
  hero_image_alt text,
  -- Structured blocks (paragraph, heading, image, list, table, comparison,
  -- quote, cta, product recommendation). Never store uncontrolled HTML.
  content jsonb NOT NULL DEFAULT '[]'::jsonb,
  status public.content_status NOT NULL DEFAULT 'draft',
  featured boolean NOT NULL DEFAULT false,
  meta_title text,
  meta_description text,
  canonical_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  CONSTRAINT articles_type_slug_unique UNIQUE (type, slug),
  CONSTRAINT articles_content_is_array CHECK (jsonb_typeof(content) = 'array')
);

CREATE INDEX articles_author_id_idx ON public.articles (author_id);
CREATE INDEX articles_status_idx ON public.articles (status);
CREATE INDEX articles_published_at_idx ON public.articles (published_at);
CREATE INDEX articles_type_status_idx ON public.articles (type, status);
CREATE INDEX articles_featured_idx ON public.articles (featured) WHERE featured;

CREATE TRIGGER articles_set_updated_at
  BEFORE UPDATE ON public.articles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.article_faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.articles (id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  position integer NOT NULL DEFAULT 0
);

CREATE INDEX article_faqs_article_id_idx ON public.article_faqs (article_id);
CREATE INDEX article_faqs_position_idx ON public.article_faqs (article_id, position);

CREATE TABLE public.article_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.articles (id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products (id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  section_label text,
  CONSTRAINT article_products_unique UNIQUE (article_id, product_id)
);

CREATE INDEX article_products_article_id_idx ON public.article_products (article_id);
CREATE INDEX article_products_product_id_idx ON public.article_products (product_id);
CREATE INDEX article_products_position_idx ON public.article_products (article_id, position);

CREATE TABLE public.article_relations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.articles (id) ON DELETE CASCADE,
  related_article_id uuid NOT NULL REFERENCES public.articles (id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  CONSTRAINT article_relations_unique UNIQUE (article_id, related_article_id),
  CONSTRAINT article_relations_no_self CHECK (article_id <> related_article_id)
);

CREATE INDEX article_relations_article_id_idx ON public.article_relations (article_id);
CREATE INDEX article_relations_related_article_id_idx ON public.article_relations (related_article_id);
CREATE INDEX article_relations_position_idx ON public.article_relations (article_id, position);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_relations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.admin_users FORCE ROW LEVEL SECURITY;
ALTER TABLE public.collections FORCE ROW LEVEL SECURITY;
ALTER TABLE public.products FORCE ROW LEVEL SECURITY;
ALTER TABLE public.product_collections FORCE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants FORCE ROW LEVEL SECURITY;
ALTER TABLE public.product_images FORCE ROW LEVEL SECURITY;
ALTER TABLE public.product_specs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews FORCE ROW LEVEL SECURITY;
ALTER TABLE public.product_faqs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.authors FORCE ROW LEVEL SECURITY;
ALTER TABLE public.articles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.article_faqs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.article_products FORCE ROW LEVEL SECURITY;
ALTER TABLE public.article_relations FORCE ROW LEVEL SECURITY;

-- Admin users: never public. Admins manage the allow-list.
CREATE POLICY admin_users_admin_select
  ON public.admin_users
  FOR SELECT
  TO authenticated
  USING ((SELECT public.is_admin()));

CREATE POLICY admin_users_admin_insert
  ON public.admin_users
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY admin_users_admin_update
  ON public.admin_users
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY admin_users_admin_delete
  ON public.admin_users
  FOR DELETE
  TO authenticated
  USING ((SELECT public.is_admin()));

-- Published website content is readable. Only admins may write.
CREATE POLICY collections_public_select
  ON public.collections
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published' OR (SELECT public.is_admin()));

CREATE POLICY collections_admin_insert
  ON public.collections
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY collections_admin_update
  ON public.collections
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY collections_admin_delete
  ON public.collections
  FOR DELETE
  TO authenticated
  USING ((SELECT public.is_admin()));

CREATE POLICY products_public_select
  ON public.products
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published' OR (SELECT public.is_admin()));

CREATE POLICY products_admin_insert
  ON public.products
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY products_admin_update
  ON public.products
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY products_admin_delete
  ON public.products
  FOR DELETE
  TO authenticated
  USING ((SELECT public.is_admin()));

CREATE POLICY product_collections_public_select
  ON public.product_collections
  FOR SELECT
  TO anon, authenticated
  USING (
    (SELECT public.is_admin())
    OR EXISTS (
      SELECT 1
      FROM public.products AS products
      WHERE products.id = product_collections.product_id
        AND products.status = 'published'
    )
  );

CREATE POLICY product_collections_admin_insert
  ON public.product_collections
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY product_collections_admin_update
  ON public.product_collections
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY product_collections_admin_delete
  ON public.product_collections
  FOR DELETE
  TO authenticated
  USING ((SELECT public.is_admin()));

CREATE POLICY product_variants_public_select
  ON public.product_variants
  FOR SELECT
  TO anon, authenticated
  USING (
    (SELECT public.is_admin())
    OR EXISTS (
      SELECT 1
      FROM public.products AS products
      WHERE products.id = product_variants.product_id
        AND products.status = 'published'
    )
  );

CREATE POLICY product_variants_admin_insert
  ON public.product_variants
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY product_variants_admin_update
  ON public.product_variants
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY product_variants_admin_delete
  ON public.product_variants
  FOR DELETE
  TO authenticated
  USING ((SELECT public.is_admin()));

CREATE POLICY product_images_public_select
  ON public.product_images
  FOR SELECT
  TO anon, authenticated
  USING (
    (SELECT public.is_admin())
    OR EXISTS (
      SELECT 1
      FROM public.products AS products
      WHERE products.id = product_images.product_id
        AND products.status = 'published'
    )
  );

CREATE POLICY product_images_admin_insert
  ON public.product_images
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY product_images_admin_update
  ON public.product_images
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY product_images_admin_delete
  ON public.product_images
  FOR DELETE
  TO authenticated
  USING ((SELECT public.is_admin()));

CREATE POLICY product_specs_public_select
  ON public.product_specs
  FOR SELECT
  TO anon, authenticated
  USING (
    (SELECT public.is_admin())
    OR EXISTS (
      SELECT 1
      FROM public.products AS products
      WHERE products.id = product_specs.product_id
        AND products.status = 'published'
    )
  );

CREATE POLICY product_specs_admin_insert
  ON public.product_specs
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY product_specs_admin_update
  ON public.product_specs
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY product_specs_admin_delete
  ON public.product_specs
  FOR DELETE
  TO authenticated
  USING ((SELECT public.is_admin()));

CREATE POLICY product_reviews_public_select
  ON public.product_reviews
  FOR SELECT
  TO anon, authenticated
  USING (
    (SELECT public.is_admin())
    OR (
      status = 'published'
      AND EXISTS (
        SELECT 1
        FROM public.products AS products
        WHERE products.id = product_reviews.product_id
          AND products.status = 'published'
      )
    )
  );

CREATE POLICY product_reviews_admin_insert
  ON public.product_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY product_reviews_admin_update
  ON public.product_reviews
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY product_reviews_admin_delete
  ON public.product_reviews
  FOR DELETE
  TO authenticated
  USING ((SELECT public.is_admin()));

CREATE POLICY product_faqs_public_select
  ON public.product_faqs
  FOR SELECT
  TO anon, authenticated
  USING (
    (SELECT public.is_admin())
    OR EXISTS (
      SELECT 1
      FROM public.products AS products
      WHERE products.id = product_faqs.product_id
        AND products.status = 'published'
    )
  );

CREATE POLICY product_faqs_admin_insert
  ON public.product_faqs
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY product_faqs_admin_update
  ON public.product_faqs
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY product_faqs_admin_delete
  ON public.product_faqs
  FOR DELETE
  TO authenticated
  USING ((SELECT public.is_admin()));

-- Authors have no draft/published status; they are public profile records.
CREATE POLICY authors_public_select
  ON public.authors
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY authors_admin_insert
  ON public.authors
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY authors_admin_update
  ON public.authors
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY authors_admin_delete
  ON public.authors
  FOR DELETE
  TO authenticated
  USING ((SELECT public.is_admin()));

CREATE POLICY articles_public_select
  ON public.articles
  FOR SELECT
  TO anon, authenticated
  USING (status = 'published' OR (SELECT public.is_admin()));

CREATE POLICY articles_admin_insert
  ON public.articles
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY articles_admin_update
  ON public.articles
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY articles_admin_delete
  ON public.articles
  FOR DELETE
  TO authenticated
  USING ((SELECT public.is_admin()));

CREATE POLICY article_faqs_public_select
  ON public.article_faqs
  FOR SELECT
  TO anon, authenticated
  USING (
    (SELECT public.is_admin())
    OR EXISTS (
      SELECT 1
      FROM public.articles AS articles
      WHERE articles.id = article_faqs.article_id
        AND articles.status = 'published'
    )
  );

CREATE POLICY article_faqs_admin_insert
  ON public.article_faqs
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY article_faqs_admin_update
  ON public.article_faqs
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY article_faqs_admin_delete
  ON public.article_faqs
  FOR DELETE
  TO authenticated
  USING ((SELECT public.is_admin()));

CREATE POLICY article_products_public_select
  ON public.article_products
  FOR SELECT
  TO anon, authenticated
  USING (
    (SELECT public.is_admin())
    OR EXISTS (
      SELECT 1
      FROM public.articles AS articles
      WHERE articles.id = article_products.article_id
        AND articles.status = 'published'
    )
  );

CREATE POLICY article_products_admin_insert
  ON public.article_products
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY article_products_admin_update
  ON public.article_products
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY article_products_admin_delete
  ON public.article_products
  FOR DELETE
  TO authenticated
  USING ((SELECT public.is_admin()));

CREATE POLICY article_relations_public_select
  ON public.article_relations
  FOR SELECT
  TO anon, authenticated
  USING (
    (SELECT public.is_admin())
    OR EXISTS (
      SELECT 1
      FROM public.articles AS articles
      WHERE articles.id = article_relations.article_id
        AND articles.status = 'published'
    )
  );

CREATE POLICY article_relations_admin_insert
  ON public.article_relations
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY article_relations_admin_update
  ON public.article_relations
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY article_relations_admin_delete
  ON public.article_relations
  FOR DELETE
  TO authenticated
  USING ((SELECT public.is_admin()));

-- ---------------------------------------------------------------------------
-- Privileges (tables are not auto-exposed to the Data API)
-- ---------------------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON TABLE
  public.collections,
  public.products,
  public.product_collections,
  public.product_variants,
  public.product_images,
  public.product_specs,
  public.product_reviews,
  public.product_faqs,
  public.authors,
  public.articles,
  public.article_faqs,
  public.article_products,
  public.article_relations
TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.admin_users TO authenticated;

GRANT INSERT, UPDATE, DELETE ON TABLE
  public.collections,
  public.products,
  public.product_collections,
  public.product_variants,
  public.product_images,
  public.product_specs,
  public.product_reviews,
  public.product_faqs,
  public.authors,
  public.articles,
  public.article_faqs,
  public.article_products,
  public.article_relations
TO authenticated;

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'product-images',
    'product-images',
    true,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
  ),
  (
    'collection-images',
    'collection-images',
    true,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
  ),
  (
    'article-images',
    'article-images',
    true,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
  ),
  (
    'author-images',
    'author-images',
    true,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
  );

-- Public buckets serve known object URLs without a SELECT policy.
-- Admin SELECT is required for upsert (INSERT + SELECT + UPDATE).
CREATE POLICY website_images_admin_select
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id IN ('product-images', 'collection-images', 'article-images', 'author-images')
    AND (SELECT public.is_admin())
  );

CREATE POLICY website_images_admin_insert
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id IN ('product-images', 'collection-images', 'article-images', 'author-images')
    AND (SELECT public.is_admin())
  );

CREATE POLICY website_images_admin_update
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id IN ('product-images', 'collection-images', 'article-images', 'author-images')
    AND (SELECT public.is_admin())
  )
  WITH CHECK (
    bucket_id IN ('product-images', 'collection-images', 'article-images', 'author-images')
    AND (SELECT public.is_admin())
  );

CREATE POLICY website_images_admin_delete
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id IN ('product-images', 'collection-images', 'article-images', 'author-images')
    AND (SELECT public.is_admin())
  );
