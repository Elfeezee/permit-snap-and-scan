-- Fix the generate_kasupda_permit_id function to correctly find the highest ID
CREATE OR REPLACE FUNCTION public.generate_kasupda_permit_id()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    next_number integer;
    new_id text;
BEGIN
    -- Get the highest number from existing KASUPDA permit IDs
    SELECT COALESCE(
        MAX(
            (regexp_match(id, 'KASUPDA-PERMIT-(\d+)'))[1]::integer
        ), 
        0
    ) + 1
    INTO next_number
    FROM documents 
    WHERE id ~ 'KASUPDA-PERMIT-\d+';
    
    -- Format the new ID with zero-padding
    new_id := 'KASUPDA-PERMIT-' || LPAD(next_number::text, 3, '0');
    
    RETURN new_id;
END;
$function$;