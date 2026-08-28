-- Drop table-level extras that bypass RLS (TRUNCATE) and are unused by /admin.

REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE public.keyword_imports FROM authenticated, anon;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON TABLE public.keywords FROM authenticated, anon;
