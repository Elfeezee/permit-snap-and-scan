ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS is_private boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_documents_is_private ON public.documents(is_private);