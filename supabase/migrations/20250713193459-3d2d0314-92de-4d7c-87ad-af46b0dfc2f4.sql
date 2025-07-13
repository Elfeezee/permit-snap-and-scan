-- Modify the documents table to use text IDs instead of UUID
-- First, let's alter the table to change the id column type and remove the UUID default
ALTER TABLE public.documents ALTER COLUMN id TYPE text;
ALTER TABLE public.documents ALTER COLUMN id DROP DEFAULT;

-- Create a function to generate sequential KASUPDA permit IDs
CREATE OR REPLACE FUNCTION generate_kasupda_permit_id()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    next_number integer;
    new_id text;
BEGIN
    -- Get the highest number from existing KASUPDA permit IDs
    SELECT COALESCE(
        MAX(
            CAST(
                SPLIT_PART(
                    SPLIT_PART(id, 'KASUPDA-PERMIT-', 2), 
                    '-', 1
                ) AS integer
            )
        ), 
        0
    ) + 1
    INTO next_number
    FROM documents 
    WHERE id LIKE 'KASUPDA-PERMIT-%';
    
    -- Format the new ID with zero-padding
    new_id := 'KASUPDA-PERMIT-' || LPAD(next_number::text, 3, '0');
    
    RETURN new_id;
END;
$$;