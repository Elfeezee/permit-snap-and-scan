-- Replace function with simpler working version
CREATE OR REPLACE FUNCTION public.generate_kasupda_permit_id()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN 'KASUPDA-PERMIT-' || LPAD(
        (
            SELECT COALESCE(
                MAX((regexp_match(id, 'KASUPDA-PERMIT-([0-9]+)'))[1]::integer),
                0
            ) + 1
            FROM documents 
            WHERE id LIKE 'KASUPDA-PERMIT-%'
        )::text, 
        3, 
        '0'
    );
END;
$function$;