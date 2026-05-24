-- Fix collection comment access: align with who can view tracks in a collection
-- (public tracks, profile members, collection owner, collection members)

CREATE OR REPLACE FUNCTION public.can_view_collection_track_comments(p_collection_id INTEGER)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.collections c
    WHERE c.id = p_collection_id
      AND c.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.collection_members cm
    WHERE cm.collection_id = p_collection_id
      AND cm.member_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.collections_sounds cs
    JOIN public.sounds s ON s.id = cs.sound_id
    WHERE cs.collection_id = p_collection_id
      AND (
        s.is_public = true
        OR s.user_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.profile_members pm
          WHERE pm.profile_id = s.user_id
            AND pm.member_id = auth.uid()
        )
      )
  );
$$;
