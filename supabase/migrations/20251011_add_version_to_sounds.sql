-- Add version column to sounds table for music version control
-- Date: 2025-10-11

ALTER TABLE public.sounds 
ADD COLUMN IF NOT EXISTS version TEXT;

-- Add index for searching by version
CREATE INDEX IF NOT EXISTS idx_sounds_version ON public.sounds(version);

-- Optional: Set default version for existing tracks
UPDATE public.sounds 
SET version = 'v1.0'
WHERE version IS NULL;

