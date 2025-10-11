-- Migration: Update collection column to be a foreign key reference
-- Date: 2025-10-11

-- Drop the old collection TEXT column (if it exists)
ALTER TABLE public.sounds 
DROP COLUMN IF EXISTS collection;

-- Add new collection_id as foreign key
ALTER TABLE public.sounds 
ADD COLUMN IF NOT EXISTS collection_id INTEGER REFERENCES public.collections(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_sounds_collection_id ON public.sounds(collection_id);

