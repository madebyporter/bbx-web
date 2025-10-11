-- Migration: Add audio metadata columns to sounds table
-- Date: 2025-10-11

-- Add audio metadata columns to sounds table
ALTER TABLE public.sounds 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

ALTER TABLE public.sounds 
ADD COLUMN IF NOT EXISTS storage_path TEXT;

ALTER TABLE public.sounds 
ADD COLUMN IF NOT EXISTS artist TEXT;

ALTER TABLE public.sounds 
ADD COLUMN IF NOT EXISTS collection_id INTEGER REFERENCES public.collections(id);

ALTER TABLE public.sounds 
ADD COLUMN IF NOT EXISTS genre TEXT;

ALTER TABLE public.sounds 
ADD COLUMN IF NOT EXISTS mood TEXT[];

ALTER TABLE public.sounds 
ADD COLUMN IF NOT EXISTS bpm INTEGER;

ALTER TABLE public.sounds 
ADD COLUMN IF NOT EXISTS year INTEGER;

ALTER TABLE public.sounds 
ADD COLUMN IF NOT EXISTS track_number INTEGER;

ALTER TABLE public.sounds 
ADD COLUMN IF NOT EXISTS disc_number INTEGER;

ALTER TABLE public.sounds 
ADD COLUMN IF NOT EXISTS file_size INTEGER;

ALTER TABLE public.sounds 
ADD COLUMN IF NOT EXISTS duration FLOAT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sounds_user_id ON public.sounds(user_id);
CREATE INDEX IF NOT EXISTS idx_sounds_storage_path ON public.sounds(storage_path);

-- ============================================================================
-- MANUAL SETUP REQUIRED: Storage Bucket & Policies
-- ============================================================================
-- These steps must be done via Supabase Dashboard:
--
-- 1. Go to Storage in your Supabase Dashboard
-- 2. Click "New bucket"
-- 3. Bucket name: "sounds"
-- 4. Set as Public: YES (check the box)
-- 5. Click "Create bucket"
--
-- 6. Click on the "sounds" bucket
-- 7. Go to "Policies" tab
-- 8. Add the following policies:
--
--    Policy 1 - "Anyone can read sounds"
--    - Allowed operation: SELECT
--    - Policy definition:
--      bucket_id = 'sounds'
--
--    Policy 2 - "Users can upload to own folder"
--    - Allowed operation: INSERT
--    - Policy definition:
--      bucket_id = 'sounds' AND 
--      (storage.foldername(name))[1] = auth.uid()::text
--
--    Policy 3 - "Users can delete own files"
--    - Allowed operation: DELETE
--    - Policy definition:
--      bucket_id = 'sounds' AND 
--      (storage.foldername(name))[1] = auth.uid()::text
