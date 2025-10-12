-- Migration: Add Track Groups to Sounds
-- Date: 2025-10-12

-- Add track_group_name to sounds table for grouping related tracks
ALTER TABLE public.sounds 
ADD COLUMN IF NOT EXISTS track_group_name TEXT;

-- Create index for fast group lookups
CREATE INDEX IF NOT EXISTS idx_sounds_track_group_name 
  ON public.sounds(user_id, track_group_name);

-- Note: Existing tracks will need track_group_name generated via auto-scan
-- This can be done via a utility script or manually updated

