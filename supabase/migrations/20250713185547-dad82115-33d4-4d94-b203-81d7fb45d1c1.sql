-- Create documents table for document metadata
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  size_mb DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('uploaded', 'processing', 'processed')) DEFAULT 'uploaded',
  upload_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_date TIMESTAMP WITH TIME ZONE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  original_file_path TEXT,
  processed_file_path TEXT,
  shareable_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Create policies for document access
CREATE POLICY "Users can view their own documents" 
ON public.documents 
FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create documents" 
ON public.documents 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own documents" 
ON public.documents 
FOR UPDATE 
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete their own documents" 
ON public.documents 
FOR DELETE 
USING (auth.uid() = user_id OR user_id IS NULL);

-- Create storage buckets for file storage
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('documents-original', 'documents-original', false),
  ('documents-processed', 'documents-processed', true);

-- Create storage policies for original documents (private)
CREATE POLICY "Users can upload their own original documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'documents-original' AND (auth.uid()::text = (storage.foldername(name))[1] OR auth.uid() IS NULL));

CREATE POLICY "Users can view their own original documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'documents-original' AND (auth.uid()::text = (storage.foldername(name))[1] OR auth.uid() IS NULL));

CREATE POLICY "Users can update their own original documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'documents-original' AND (auth.uid()::text = (storage.foldername(name))[1] OR auth.uid() IS NULL));

CREATE POLICY "Users can delete their own original documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'documents-original' AND (auth.uid()::text = (storage.foldername(name))[1] OR auth.uid() IS NULL));

-- Create storage policies for processed documents (public access)
CREATE POLICY "Anyone can view processed documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'documents-processed');

CREATE POLICY "Users can upload processed documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'documents-processed' AND (auth.uid()::text = (storage.foldername(name))[1] OR auth.uid() IS NULL));

CREATE POLICY "Users can update processed documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'documents-processed' AND (auth.uid()::text = (storage.foldername(name))[1] OR auth.uid() IS NULL));

CREATE POLICY "Users can delete processed documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'documents-processed' AND (auth.uid()::text = (storage.foldername(name))[1] OR auth.uid() IS NULL));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_documents_updated_at
BEFORE UPDATE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for documents table
ALTER TABLE public.documents REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.documents;