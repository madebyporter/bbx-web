-- Collection artwork: storage path column (reuses public artwork bucket)

ALTER TABLE public.collections
ADD COLUMN IF NOT EXISTS artwork_path TEXT;
