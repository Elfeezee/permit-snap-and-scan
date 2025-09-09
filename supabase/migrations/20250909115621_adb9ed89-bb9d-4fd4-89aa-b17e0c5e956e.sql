-- Fix function to handle 4-digit numbers
CREATE OR REPLACE FUNCTION public.generate_kasupda_permit_id()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    next_number integer;
BEGIN
    SELECT COALESCE(
        MAX((regexp_match(id, 'KASUPDA-PERMIT-([0-9]+)'))[1]::integer),
        0
    ) + 1
    INTO next_number
    FROM documents 
    WHERE id LIKE 'KASUPDA-PERMIT-%';
    
    -- Use appropriate padding based on number size
    IF next_number < 1000 THEN
        RETURN 'KASUPDA-PERMIT-' || LPAD(next_number::text, 3, '0');
    ELSE
        RETURN 'KASUPDA-PERMIT-' || next_number::text;
    END IF;
END;
$function$;