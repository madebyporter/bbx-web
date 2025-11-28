-- Migration: Update collections_sounds RLS policy to respect track privacy
-- Date: 2025-11-28

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Anyone can view collection sounds" ON public.collections_sounds;

-- Create new SELECT policy that respects track privacy
-- Only show junction records where:
-- 1. The sound is public, OR
-- 2. User is member of sound owner's profile, OR
-- 3. User owns the sound
CREATE POLICY "Users can view collection sounds based on track privacy"
ON public.collections_sounds FOR SELECT
USING (
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
);

