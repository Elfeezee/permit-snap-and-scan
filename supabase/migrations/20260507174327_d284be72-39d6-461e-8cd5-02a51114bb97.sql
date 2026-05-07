CREATE SEQUENCE IF NOT EXISTS public.kasupda_permit_sequence START WITH 2667;

SELECT setval(
  'public.kasupda_permit_sequence',
  GREATEST(
    (
      SELECT COALESCE(
        MAX(
          CASE
            WHEN kasupda_permit_id ~ '^KASUPDA-[0-9]+$'
            THEN CAST(SUBSTRING(kasupda_permit_id FROM 9) AS INTEGER)
            ELSE 0
          END
        ),
        2666
      )
      FROM public.documents
      WHERE kasupda_permit_id IS NOT NULL
    ),
    2666
  ),
  true
);

CREATE OR REPLACE FUNCTION public.generate_kasupda_permit_id()
RETURNS text
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT 'KASUPDA-' || nextval('public.kasupda_permit_sequence')::text;
$$;

REVOKE ALL ON FUNCTION public.generate_kasupda_permit_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.generate_kasupda_permit_id() FROM anon;
GRANT EXECUTE ON FUNCTION public.generate_kasupda_permit_id() TO authenticated;

REVOKE ALL ON SEQUENCE public.kasupda_permit_sequence FROM PUBLIC;
REVOKE ALL ON SEQUENCE public.kasupda_permit_sequence FROM anon;
GRANT USAGE ON SEQUENCE public.kasupda_permit_sequence TO authenticated;