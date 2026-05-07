-- Tighten document ownership and private-account isolation
UPDATE public.documents
SET is_private = true
WHERE user_id = '19feb5d7-c2bf-4382-a7f2-320f2d92df74';

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to documents" ON public.documents;
DROP POLICY IF EXISTS "Public documents are visible and private documents are owner only" ON public.documents;
DROP POLICY IF EXISTS "Authenticated users create their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users update their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users delete their own documents" ON public.documents;

CREATE POLICY "Public documents are visible and private documents are owner only"
ON public.documents
FOR SELECT
USING (
  is_private = false
  OR (auth.uid() IS NOT NULL AND user_id = auth.uid() AND is_private = true)
);

CREATE POLICY "Authenticated users create their own documents"
ON public.documents
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND is_private = (
    lower(coalesce(auth.jwt() ->> 'email', '')) = 'elfeezee@gmail.com'
  )
);

CREATE POLICY "Users update their own documents"
ON public.documents
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND is_private = (
    lower(coalesce(auth.jwt() ->> 'email', '')) = 'elfeezee@gmail.com'
  )
);

CREATE POLICY "Users delete their own documents"
ON public.documents
FOR DELETE
TO authenticated
USING (user_id = auth.uid());