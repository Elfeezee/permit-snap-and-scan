-- Update RLS policy to allow all authenticated users to view all documents (making everyone an admin)
DROP POLICY IF EXISTS "Authenticated users can view their own documents" ON public.documents;

CREATE POLICY "All authenticated users can view all documents"
ON public.documents
FOR SELECT
TO authenticated
USING (true);

-- Update other policies to allow all authenticated users to manage all documents
DROP POLICY IF EXISTS "Authenticated users can update their own documents" ON public.documents;
DROP POLICY IF EXISTS "Authenticated users can delete their own documents" ON public.documents;

CREATE POLICY "All authenticated users can update all documents"
ON public.documents
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "All authenticated users can delete all documents"
ON public.documents
FOR DELETE
TO authenticated
USING (true);