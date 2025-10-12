-- Migration: Collections System - Add schema for collections with many-to-many relationship
-- Date: 2025-10-11

-- ============================================================================
-- UPDATE COLLECTIONS TABLE
-- ============================================================================

-- Add user_id column if it doesn't exist
ALTER TABLE public.collections 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add new columns to collections table
ALTER TABLE public.collections 
ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'Untitled Collection',
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Remove default after adding column
ALTER TABLE public.collections 
ALTER COLUMN name DROP DEFAULT;

-- Create index on slug for fast lookups (only if column exists and has values)
CREATE INDEX IF NOT EXISTS idx_collections_slug ON public.collections(slug);

-- Create index on user_id
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON public.collections(user_id);

-- ============================================================================
-- UPDATE SOUNDS TABLE - Remove collection_id column
-- ============================================================================

-- Drop the collection_id column since we're using junction table
ALTER TABLE public.sounds 
DROP COLUMN IF EXISTS collection_id;

-- ============================================================================
-- COLLECTIONS_SOUNDS JUNCTION TABLE
-- ============================================================================

-- Drop the existing table if it has wrong structure and recreate
DROP TABLE IF EXISTS public.collections_sounds CASCADE;

-- Create junction table
CREATE TABLE public.collections_sounds (
  id SERIAL PRIMARY KEY,
  collection_id INTEGER NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  sound_id INTEGER NOT NULL REFERENCES public.sounds(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(collection_id, sound_id)
);

-- Create indexes for foreign keys
CREATE INDEX idx_collections_sounds_collection_id 
  ON public.collections_sounds(collection_id);

CREATE INDEX idx_collections_sounds_sound_id 
  ON public.collections_sounds(sound_id);

-- Enable RLS on junction table
ALTER TABLE public.collections_sounds ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view collection sounds" ON public.collections_sounds;
DROP POLICY IF EXISTS "Users can add own sounds to collections" ON public.collections_sounds;
DROP POLICY IF EXISTS "Users can remove sounds from collections" ON public.collections_sounds;

-- RLS Policies for collections_sounds
-- Anyone can view what sounds are in collections
CREATE POLICY "Anyone can view collection sounds"
  ON public.collections_sounds FOR SELECT
  USING (true);

-- Users can only add their own sounds to any collection
CREATE POLICY "Users can add own sounds to collections"
  ON public.collections_sounds FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sounds
      WHERE sounds.id = sound_id
      AND sounds.user_id = auth.uid()
    )
  );

-- Users can only remove their own sounds from collections
CREATE POLICY "Users can remove sounds from collections"
  ON public.collections_sounds FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.sounds
      WHERE sounds.id = sound_id
      AND sounds.user_id = auth.uid()
    )
  );

