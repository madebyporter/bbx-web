-- Migration: Add track privacy (is_public) column to sounds table
-- Date: 2025-11-28

-- Add is_public column to sounds table
ALTER TABLE public.sounds 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- Set all existing tracks to public for backward compatibility
UPDATE public.sounds 
SET is_public = true 
WHERE is_public IS NULL;

-- Make the column NOT NULL after setting defaults
ALTER TABLE public.sounds 
ALTER COLUMN is_public SET NOT NULL;

-- Create index on is_public for query performance
CREATE INDEX IF NOT EXISTS idx_sounds_is_public 
ON public.sounds(is_public);

