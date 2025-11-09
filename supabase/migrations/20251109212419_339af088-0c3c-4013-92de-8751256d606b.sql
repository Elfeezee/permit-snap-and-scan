-- Update the function to generate sequential KASUPDA IDs starting from 2667
CREATE OR REPLACE FUNCTION public.generate_kasupda_permit_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  max_number INTEGER;
  new_number INTEGER;
  new_id TEXT;
BEGIN
  -- Get the highest number from existing permit IDs
  SELECT COALESCE(
    MAX(
      CASE 
        WHEN kasupda_permit_id ~ '^KASUPDA-[0-9]+$' 
        THEN CAST(SUBSTRING(kasupda_permit_id FROM 9) AS INTEGER)
        ELSE 0
      END
    ), 
    2666
  ) INTO max_number
  FROM public.documents
  WHERE kasupda_permit_id IS NOT NULL;
  
  -- Increment to get the new number
  new_number := max_number + 1;
  
  -- Format as KASUPDA-####
  new_id := 'KASUPDA-' || new_number::TEXT;
  
  RETURN new_id;
END;
$$;