-- Lock down document storage while keeping public QR/share links available for public documents
UPDATE storage.buckets
SET public = false
WHERE id = 'documents-processed';

DROP POLICY IF EXISTS "Allow authenticated users to upload original documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload processed documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to view original documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to view processed documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to view their own original documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload original documents in own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload processed documents in own folder" ON storage.objects;
DROP POLICY IF EXISTS "Original documents are owner only" ON storage.objects;
DROP POLICY IF EXISTS "Public processed documents are readable" ON storage.objects;
DROP POLICY IF EXISTS "Private processed documents are owner only" ON storage.objects;

CREATE POLICY "Users can upload original documents in own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents-original'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can upload processed documents in own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents-processed'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Original documents are owner only"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents-original'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Public processed documents are readable"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'documents-processed'
  AND EXISTS (
    SELECT 1
    FROM public.documents d
    WHERE d.processed_file_path = storage.objects.name
      AND d.is_private = false
  )
);

CREATE POLICY "Private processed documents are owner only"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents-processed'
  AND EXISTS (
    SELECT 1
    FROM public.documents d
    WHERE d.processed_file_path = storage.objects.name
      AND d.is_private = true
      AND d.user_id = auth.uid()
  )
);

REVOKE EXECUTE ON FUNCTION public.generate_kasupda_permit_id() FROM anon;
GRANT EXECUTE ON FUNCTION public.generate_kasupda_permit_id() TO authenticated;