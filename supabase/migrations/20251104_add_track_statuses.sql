-- Migration: Add Track Statuses System
-- Date: 2025-11-04

-- Create track_statuses table
CREATE TABLE IF NOT EXISTS public.track_statuses (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Add status_id to sounds table
ALTER TABLE public.sounds 
ADD COLUMN IF NOT EXISTS status_id BIGINT REFERENCES public.track_statuses(id) ON DELETE SET NULL;

-- Create index for fast status lookups
CREATE INDEX IF NOT EXISTS idx_sounds_status_id 
  ON public.sounds(status_id);

-- Enable Row Level Security
ALTER TABLE public.track_statuses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for track_statuses
-- Users can view their own statuses
CREATE POLICY "Users can view their own statuses"
  ON public.track_statuses
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own statuses
CREATE POLICY "Users can create their own statuses"
  ON public.track_statuses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own statuses
CREATE POLICY "Users can update their own statuses"
  ON public.track_statuses
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own statuses
CREATE POLICY "Users can delete their own statuses"
  ON public.track_statuses
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to create default statuses for a user
CREATE OR REPLACE FUNCTION create_default_statuses_for_user(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert default statuses if they don't exist for this user
  INSERT INTO public.track_statuses (user_id, name)
  SELECT target_user_id, status_name
  FROM unnest(ARRAY['Royalty Free', 'Non-exclusive', 'Exclusive', 'Used']) AS status_name
  WHERE NOT EXISTS (
    SELECT 1 FROM public.track_statuses 
    WHERE user_id = target_user_id AND name = status_name
  );
END;
$$;

-- Seed default statuses for all existing users who have tracks
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN 
    SELECT DISTINCT user_id FROM public.sounds
  LOOP
    PERFORM create_default_statuses_for_user(user_record.user_id);
  END LOOP;
END;
$$;

