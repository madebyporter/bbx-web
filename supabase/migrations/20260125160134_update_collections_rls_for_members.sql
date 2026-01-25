-- Migration: Update collections_sounds RLS to allow collection members to see private tracks
-- Date: 2026-01-25

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view collection sounds" ON public.collections_sounds;

-- Create new SELECT policy that allows:
-- 1. Viewing junction records where the track is visible (based on privacy)
-- 2. Viewing junction records in collections the user owns
-- 3. Viewing junction records in collections where user is a member (for private tracks)
CREATE POLICY "Users can view collection sounds"
ON public.collections_sounds FOR SELECT
USING (
  -- Track is visible to user (public, owned, or profile member has access)
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
  OR
  -- OR user is a member of the collection (can see private tracks in shared collections)
  EXISTS (
    SELECT 1 FROM public.collection_members cm
    WHERE cm.collection_id = collections_sounds.collection_id
    AND cm.member_id = auth.uid()
  )
);
