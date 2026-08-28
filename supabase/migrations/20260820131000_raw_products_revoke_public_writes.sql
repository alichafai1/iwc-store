-- Tighten raw_products privileges: admins read, scraper (service_role) writes.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.raw_products FROM PUBLIC, anon, authenticated;
