-- Align remote order_items insert policy with the local migration.
-- Anon cannot SELECT orders, so EXISTS(orders...) always failed under RLS.

DROP POLICY IF EXISTS order_items_anon_insert ON public.order_items;

CREATE POLICY order_items_anon_insert
  ON public.order_items
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
