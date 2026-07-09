-- Track artwork: storage column and public artwork bucket

ALTER TABLE public.sounds
ADD COLUMN IF NOT EXISTS artwork_path TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('artwork', 'artwork', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload artwork to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'artwork'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Authenticated users can read all artwork"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'artwork');

CREATE POLICY "Public users can read all artwork"
ON storage.objects
FOR SELECT
TO anon, public
USING (bucket_id = 'artwork');

CREATE POLICY "Users can update own artwork"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'artwork'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'artwork'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own artwork"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'artwork'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
