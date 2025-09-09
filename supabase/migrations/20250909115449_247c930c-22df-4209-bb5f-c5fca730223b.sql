-- Drop and recreate the function to ensure it's updated properly
DROP FUNCTION IF EXISTS public.generate_kasupda_permit_id();

CREATE OR REPLACE FUNCTION public.generate_kasupda_permit_id()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    max_number integer;
    next_number integer;
    new_id text;
BEGIN
    -- Debug: Get the max number directly
    SELECT COALESCE(
        MAX(
            (regexp_match(id, 'KASUPDA-PERMIT-(\d+)'))[1]::integer
        ), 
        0
    )
    INTO max_number
    FROM documents 
    WHERE id ~ 'KASUPDA-PERMIT-\d+';
    
    -- Calculate next number
    next_number := max_number + 1;
    
    -- Format the new ID with zero-padding
    new_id := 'KASUPDA-PERMIT-' || LPAD(next_number::text, 3, '0');
    
    RETURN new_id;
END;
$function$;