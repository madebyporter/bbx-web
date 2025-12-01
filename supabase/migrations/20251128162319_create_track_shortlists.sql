-- Migration: Create track_shortlists table for creator shortlist feature
-- Date: 2025-11-28

-- Create track_shortlists table
CREATE TABLE IF NOT EXISTS public.track_shortlists (
  id BIGSERIAL PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id BIGINT NOT NULL REFERENCES public.sounds(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(creator_id, track_id)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_track_shortlists_creator_id 
ON public.track_shortlists(creator_id);

CREATE INDEX IF NOT EXISTS idx_track_shortlists_track_id 
ON public.track_shortlists(track_id);

-- Enable Row Level Security
ALTER TABLE public.track_shortlists ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Creators can view their own shortlists" ON public.track_shortlists;
DROP POLICY IF EXISTS "Creators can add tracks to their shortlist" ON public.track_shortlists;
DROP POLICY IF EXISTS "Creators can remove tracks from their shortlist" ON public.track_shortlists;

-- RLS Policies for track_shortlists
-- Creators can view their own shortlists
CREATE POLICY "Creators can view their own shortlists"
  ON public.track_shortlists
  FOR SELECT
  USING (auth.uid() = creator_id);

-- Creators can add tracks to their shortlist
-- Only allow if the user is a creator (not audio_pro)
CREATE POLICY "Creators can add tracks to their shortlist"
  ON public.track_shortlists
  FOR INSERT
  WITH CHECK (
    auth.uid() = creator_id
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
      AND user_type = 'creator'
    )
  );

-- Creators can remove tracks from their shortlist
CREATE POLICY "Creators can remove tracks from their shortlist"
  ON public.track_shortlists
  FOR DELETE
  USING (auth.uid() = creator_id);

