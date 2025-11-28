-- Migration: Update RLS policies for sounds table to respect track privacy and memberships
-- Date: 2025-11-28

-- Drop existing SELECT policy if it exists
DROP POLICY IF EXISTS "Public users can read all sounds" ON public.sounds;
DROP POLICY IF EXISTS "Users can view sounds" ON public.sounds;
DROP POLICY IF EXISTS "Anyone can view sounds" ON public.sounds;

-- Create new SELECT policy that respects track privacy and memberships
-- Rules:
-- 1. Public tracks (is_public = true): visible to everyone
-- 2. Private tracks (is_public = false): visible to track owner OR members of track owner's profile
-- 3. Track owners always see their own tracks
CREATE POLICY "Users can view sounds based on privacy and membership"
ON public.sounds FOR SELECT
USING (
  is_public = true
  OR user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profile_members pm
    WHERE pm.profile_id = sounds.user_id
    AND pm.member_id = auth.uid()
  )
);

