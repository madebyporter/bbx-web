-- Migration: Add musical key column to sounds table
-- Date: 2025-10-22

-- Add key column to sounds table
ALTER TABLE public.sounds 
ADD COLUMN IF NOT EXISTS key TEXT;

-- Add index for key lookups (useful for filtering by key)
CREATE INDEX IF NOT EXISTS idx_sounds_key 
  ON public.sounds(key);

-- Note: Key format will be like "C Major", "A Minor", "F# Major", etc.

