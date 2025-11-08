-- Create documents table
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  size_mb NUMERIC NOT NULL,
  user_id UUID,
  kasupda_permit_id TEXT UNIQUE,
  original_file_path TEXT,
  processed_file_path TEXT,
  shareable_url TEXT,
  google_maps_link TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  processed_date TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies - allow all operations for now since auth may not be set up yet
CREATE POLICY "Allow all access to documents"
  ON public.documents
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create function to generate kasupda permit IDs
CREATE OR REPLACE FUNCTION public.generate_kasupda_permit_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_id TEXT;
  id_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate ID in format: YEAR-MONTH-RANDOM5DIGITS
    new_id := TO_CHAR(NOW(), 'YYYY-MM') || '-' || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');
    
    -- Check if ID already exists
    SELECT EXISTS(SELECT 1 FROM public.documents WHERE kasupda_permit_id = new_id) INTO id_exists;
    
    -- Exit loop if ID is unique
    EXIT WHEN NOT id_exists;
  END LOOP;
  
  RETURN new_id;
END;
$$;

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('documents-original', 'documents-original', false),
  ('documents-processed', 'documents-processed', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for documents-original (private)
CREATE POLICY "Allow authenticated users to upload original documents"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'documents-original');

CREATE POLICY "Allow users to view their own original documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'documents-original');

CREATE POLICY "Allow public to view original documents"
  ON storage.objects
  FOR SELECT
  TO anon
  USING (bucket_id = 'documents-original');

-- Create storage policies for documents-processed (public)
CREATE POLICY "Allow authenticated users to upload processed documents"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'documents-processed');

CREATE POLICY "Allow public to view processed documents"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'documents-processed');

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for documents table
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();