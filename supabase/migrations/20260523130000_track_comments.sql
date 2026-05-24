-- Migration: Track comments (library + collection scoped)
-- Date: 2026-05-23

-- ============================================================================
-- TRACK_COMMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.track_comments (
  id BIGSERIAL PRIMARY KEY,
  track_id INTEGER NOT NULL REFERENCES public.sounds(id) ON DELETE CASCADE,
  collection_id INTEGER REFERENCES public.collections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT track_comments_content_not_empty CHECK (char_length(trim(content)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_track_comments_track_library
  ON public.track_comments(track_id, created_at DESC)
  WHERE collection_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_track_comments_collection_track
  ON public.track_comments(collection_id, track_id, created_at DESC)
  WHERE collection_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_track_comments_user_id
  ON public.track_comments(user_id);

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_track_comment_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_track_comment_updated_at ON public.track_comments;
CREATE TRIGGER update_track_comment_updated_at
  BEFORE UPDATE ON public.track_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_track_comment_updated_at();

-- ============================================================================
-- RLS HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.track_in_collection(p_track_id INTEGER, p_collection_id INTEGER)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.collections_sounds cs
    WHERE cs.sound_id = p_track_id
      AND cs.collection_id = p_collection_id
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_library_track_comments(p_track_id INTEGER)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.sounds s
    WHERE s.id = p_track_id
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
  );
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.track_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View library track comments" ON public.track_comments;
DROP POLICY IF EXISTS "View collection track comments" ON public.track_comments;
DROP POLICY IF EXISTS "Create library track comments" ON public.track_comments;
DROP POLICY IF EXISTS "Create collection track comments" ON public.track_comments;
DROP POLICY IF EXISTS "Users can update own track comments" ON public.track_comments;
DROP POLICY IF EXISTS "Users can delete own track comments" ON public.track_comments;

CREATE POLICY "View library track comments"
  ON public.track_comments FOR SELECT
  USING (
    collection_id IS NULL
    AND auth.uid() IS NOT NULL
    AND public.can_view_library_track_comments(track_id)
  );

CREATE POLICY "View collection track comments"
  ON public.track_comments FOR SELECT
  USING (
    collection_id IS NOT NULL
    AND auth.uid() IS NOT NULL
    AND public.can_view_collection_track_comments(collection_id)
    AND public.track_in_collection(track_id, collection_id)
  );

CREATE POLICY "Create library track comments"
  ON public.track_comments FOR INSERT
  WITH CHECK (
    collection_id IS NULL
    AND auth.uid() = user_id
    AND public.can_view_library_track_comments(track_id)
  );

CREATE POLICY "Create collection track comments"
  ON public.track_comments FOR INSERT
  WITH CHECK (
    collection_id IS NOT NULL
    AND auth.uid() = user_id
    AND public.can_view_collection_track_comments(collection_id)
    AND public.track_in_collection(track_id, collection_id)
  );

CREATE POLICY "Users can update own track comments"
  ON public.track_comments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own track comments"
  ON public.track_comments FOR DELETE
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.track_comments TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.track_comments_id_seq TO authenticated;
