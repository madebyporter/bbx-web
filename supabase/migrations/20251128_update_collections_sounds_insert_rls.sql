-- Migration: Update collections_sounds INSERT, DELETE, and SELECT policies to allow creators to manage shortlisted tracks
-- Date: 2025-11-28

-- Drop existing policies (both old and new names)
DROP POLICY IF EXISTS "Users can add own sounds to collections" ON public.collections_sounds;
DROP POLICY IF EXISTS "Users can add sounds to collections" ON public.collections_sounds;
DROP POLICY IF EXISTS "Users can remove sounds from collections" ON public.collections_sounds;
DROP POLICY IF EXISTS "Users can view collection sounds based on track privacy" ON public.collections_sounds;
DROP POLICY IF EXISTS "Users can view collection sounds" ON public.collections_sounds;

-- Create new INSERT policy that allows:
-- 1. Users to add their own sounds to any collection
-- 2. Creator users to add shortlisted tracks to their own collections
CREATE POLICY "Users can add sounds to collections"
ON public.collections_sounds FOR INSERT
WITH CHECK (
  -- User owns the sound
  EXISTS (
    SELECT 1 FROM public.sounds s
    WHERE s.id = collections_sounds.sound_id
    AND s.user_id = auth.uid()
  )
  OR
  -- OR user is a creator, owns the collection, and has the track in their shortlist
  (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
      AND up.user_type = 'creator'
    )
    AND EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collections_sounds.collection_id
      AND c.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.track_shortlists ts
      WHERE ts.creator_id = auth.uid()
      AND ts.track_id = collections_sounds.sound_id
    )
  )
);

-- Create new DELETE policy that allows:
-- 1. Users to remove their own sounds from any collection
-- 2. Users to remove sounds from their own collections (for creators managing shortlisted tracks)
CREATE POLICY "Users can remove sounds from collections"
ON public.collections_sounds FOR DELETE
USING (
  -- User owns the sound
  EXISTS (
    SELECT 1 FROM public.sounds s
    WHERE s.id = collections_sounds.sound_id
    AND s.user_id = auth.uid()
  )
  OR
  -- OR user owns the collection
  EXISTS (
    SELECT 1 FROM public.collections c
    WHERE c.id = collections_sounds.collection_id
    AND c.user_id = auth.uid()
  )
);

-- Create new SELECT policy that allows:
-- 1. Viewing junction records where the track is visible (based on privacy)
-- 2. Viewing junction records in collections the user owns (so creators can see their own collection-track relationships)
CREATE POLICY "Users can view collection sounds"
ON public.collections_sounds FOR SELECT
USING (
  -- Track is visible to user (public, owned, or member has access)
  EXISTS (
    SELECT 1 FROM public.sounds s
    WHERE s.id = collections_sounds.sound_id
    AND (
      s.is_public = true
      OR s.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.profile_members pm
        WHERE pm.profile_id = s.user_id
        AND pm.member_id = auth.uid()
      )
    )
  )
  OR
  -- OR user owns the collection (so they can see all tracks in their collections)
  EXISTS (
    SELECT 1 FROM public.collections c
    WHERE c.id = collections_sounds.collection_id
    AND c.user_id = auth.uid()
  )
);

