-- Update RLS policies to allow public access to documents via shareable URLs
-- This allows anyone with the shareable URL to view the document without authentication

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can create documents" ON public.documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON public.documents;

-- Create new policies that allow public access via shareable URLs
CREATE POLICY "Public can view documents with shareable URLs" 
ON public.documents 
FOR SELECT 
USING (shareable_url IS NOT NULL);

CREATE POLICY "Authenticated users can view their own documents" 
ON public.documents 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can create documents" 
ON public.documents 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update their own documents" 
ON public.documents 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete their own documents" 
ON public.documents 
FOR DELETE 
USING (auth.uid() = user_id);