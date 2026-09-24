-- Minimal storefront orders for offline payment methods (bank / Revolut-Wise / crypto).
-- Public clients may insert only; admins may read and update. No public SELECT.

CREATE TYPE public.order_payment_status AS ENUM ('pending', 'paid', 'cancelled');
CREATE TYPE public.order_payment_method AS ENUM ('bank-transfer', 'revolut-wise', 'crypto');

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text NOT NULL,
  customer_first_name text NOT NULL,
  customer_last_name text NOT NULL,
  shipping_country text NOT NULL,
  shipping_address text NOT NULL,
  shipping_apartment text,
  shipping_city text NOT NULL,
  shipping_state text,
  shipping_postal_code text NOT NULL,
  billing_same_as_shipping boolean NOT NULL DEFAULT true,
  billing_country text,
  billing_first_name text,
  billing_last_name text,
  billing_address text,
  billing_apartment text,
  billing_city text,
  billing_state text,
  billing_postal_code text,
  shipping_option_id text NOT NULL,
  shipping_label text NOT NULL,
  shipping_cost numeric(10, 2) NOT NULL DEFAULT 0,
  payment_method public.order_payment_method NOT NULL,
  payment_status public.order_payment_status NOT NULL DEFAULT 'pending',
  subtotal numeric(10, 2) NOT NULL,
  discount_amount numeric(10, 2) NOT NULL DEFAULT 0,
  discount_label text,
  total numeric(10, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  email_offers boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT orders_order_number_key UNIQUE (order_number),
  CONSTRAINT orders_subtotal_nonnegative CHECK (subtotal >= 0),
  CONSTRAINT orders_discount_nonnegative CHECK (discount_amount >= 0),
  CONSTRAINT orders_shipping_nonnegative CHECK (shipping_cost >= 0),
  CONSTRAINT orders_total_nonnegative CHECK (total >= 0)
);

CREATE INDEX orders_created_at_idx ON public.orders (created_at DESC);
CREATE INDEX orders_payment_status_idx ON public.orders (payment_status);
CREATE INDEX orders_customer_email_idx ON public.orders (customer_email);

CREATE TRIGGER orders_set_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders (id) ON DELETE CASCADE,
  product_slug text NOT NULL,
  product_title text NOT NULL,
  quality text NOT NULL,
  unit_price numeric(10, 2) NOT NULL,
  quantity integer NOT NULL,
  line_total numeric(10, 2) NOT NULL,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT order_items_quantity_positive CHECK (quantity > 0),
  CONSTRAINT order_items_unit_price_nonnegative CHECK (unit_price >= 0),
  CONSTRAINT order_items_line_total_nonnegative CHECK (line_total >= 0)
);

CREATE INDEX order_items_order_id_idx ON public.order_items (order_id);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY orders_anon_insert
  ON public.orders
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    payment_status = 'pending'
    AND payment_method IN ('bank-transfer', 'revolut-wise', 'crypto')
  );

CREATE POLICY orders_admin_select
  ON public.orders
  FOR SELECT
  TO authenticated
  USING ((SELECT public.is_admin()));

CREATE POLICY orders_admin_update
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY orders_admin_delete
  ON public.orders
  FOR DELETE
  TO authenticated
  USING ((SELECT public.is_admin()));

-- WITH CHECK (true) is required because anon cannot SELECT orders under RLS,
-- so an EXISTS subquery against orders would always fail for public inserts.
-- order_id still requires a real FK to public.orders.
CREATE POLICY order_items_anon_insert
  ON public.order_items
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY order_items_admin_select
  ON public.order_items
  FOR SELECT
  TO authenticated
  USING ((SELECT public.is_admin()));

CREATE POLICY order_items_admin_update
  ON public.order_items
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY order_items_admin_delete
  ON public.order_items
  FOR DELETE
  TO authenticated
  USING ((SELECT public.is_admin()));

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.orders TO authenticated;
GRANT INSERT ON TABLE public.orders TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.order_items TO authenticated;
GRANT INSERT ON TABLE public.order_items TO anon;
