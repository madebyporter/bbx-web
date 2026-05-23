-- Idempotent finish script for track analytics (safe to re-run)
-- Use this if 20260523120000_track_analytics.sql partially applied.

-- ============================================================================
-- track_listen_sessions (skip if exists)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.track_listen_sessions (
  id BIGSERIAL PRIMARY KEY,
  track_id BIGINT NOT NULL REFERENCES public.sounds(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listener_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_seconds NUMERIC NOT NULL DEFAULT 0,
  track_duration_seconds NUMERIC,
  counted_as_play BOOLEAN NOT NULL DEFAULT false,
  source TEXT NOT NULL DEFAULT 'library',
  collection_id INTEGER REFERENCES public.collections(id) ON DELETE SET NULL,
  CONSTRAINT track_listen_sessions_source_check
    CHECK (source IN ('library', 'collection', 'track_page'))
);

CREATE INDEX IF NOT EXISTS idx_track_listen_sessions_owner_started
  ON public.track_listen_sessions (owner_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_track_listen_sessions_track_started
  ON public.track_listen_sessions (track_id, started_at DESC);

ALTER TABLE public.track_listen_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can read listen sessions" ON public.track_listen_sessions;
CREATE POLICY "Owners can read listen sessions"
  ON public.track_listen_sessions
  FOR SELECT
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Insert listen sessions excluding track owner" ON public.track_listen_sessions;
CREATE POLICY "Insert listen sessions excluding track owner"
  ON public.track_listen_sessions
  FOR INSERT
  WITH CHECK (
    (listener_id IS NULL OR listener_id <> owner_id)
    AND EXISTS (
      SELECT 1 FROM public.sounds s
      WHERE s.id = track_id AND s.user_id = owner_id
    )
  );

GRANT INSERT ON public.track_listen_sessions TO anon, authenticated;
GRANT SELECT ON public.track_listen_sessions TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.track_listen_sessions_id_seq TO anon, authenticated;

-- ============================================================================
-- profile_page_views
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profile_page_views (
  id BIGSERIAL PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  page_type TEXT NOT NULL,
  resource_id BIGINT,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT profile_page_views_page_type_check
    CHECK (page_type IN ('profile', 'collection', 'track'))
);

CREATE INDEX IF NOT EXISTS idx_profile_page_views_profile_viewed
  ON public.profile_page_views (profile_id, viewed_at DESC);

ALTER TABLE public.profile_page_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profile owners can read page views" ON public.profile_page_views;
CREATE POLICY "Profile owners can read page views"
  ON public.profile_page_views
  FOR SELECT
  USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Insert page views excluding profile owner" ON public.profile_page_views;
CREATE POLICY "Insert page views excluding profile owner"
  ON public.profile_page_views
  FOR INSERT
  WITH CHECK (
    viewer_id IS NULL OR viewer_id <> profile_id
  );

GRANT INSERT ON public.profile_page_views TO anon, authenticated;
GRANT SELECT ON public.profile_page_views TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.profile_page_views_id_seq TO anon, authenticated;

-- ============================================================================
-- get_track_analytics RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_track_analytics(
  p_owner_id UUID,
  p_track_ids BIGINT[],
  p_from TIMESTAMPTZ,
  p_to TIMESTAMPTZ,
  p_collection_id INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_summary JSONB;
  v_tracks JSONB;
  v_page_views BIGINT;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_owner_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_track_ids IS NULL OR array_length(p_track_ids, 1) IS NULL THEN
    RETURN jsonb_build_object(
      'summary', jsonb_build_object(
        'total_plays', 0,
        'total_listeners', 0,
        'avg_listen_percent', 0,
        'page_views', 0,
        'top_track_id', NULL,
        'top_track_plays', 0
      ),
      'tracks', '[]'::jsonb
    );
  END IF;

  WITH plays AS (
    SELECT
      tls.id,
      tls.track_id,
      tls.listener_id,
      tls.duration_seconds,
      tls.track_duration_seconds
    FROM public.track_listen_sessions tls
    WHERE tls.owner_id = p_owner_id
      AND tls.track_id = ANY (p_track_ids)
      AND tls.counted_as_play = true
      AND tls.started_at >= p_from
      AND tls.started_at < p_to
  ),
  per_track AS (
    SELECT
      p.track_id,
      COUNT(*)::INTEGER AS play_count,
      COUNT(
        DISTINCT COALESCE(p.listener_id::text, 'anon:' || p.id::text)
      )::INTEGER AS listener_count,
      COALESCE(AVG(p.duration_seconds), 0)::NUMERIC AS avg_duration_seconds,
      CASE
        WHEN COALESCE(AVG(NULLIF(p.track_duration_seconds, 0)), 0) > 0 THEN
          LEAST(
            100,
            ROUND(
              (AVG(p.duration_seconds) / AVG(NULLIF(p.track_duration_seconds, 0))) * 100,
              1
            )
          )
        ELSE 0
      END::NUMERIC AS avg_listen_percent,
      CASE
        WHEN COUNT(*) = 0 THEN 0
        ELSE ROUND(
          (
            COUNT(*) FILTER (
              WHERE p.track_duration_seconds > 0
                AND p.duration_seconds >= p.track_duration_seconds * 0.8
            )::NUMERIC / COUNT(*)::NUMERIC
          ) * 100,
          1
        )
      END::NUMERIC AS completion_rate
    FROM plays p
    GROUP BY p.track_id
  ),
  scope_stats AS (
    SELECT
      COUNT(*)::INTEGER AS total_plays,
      COUNT(
        DISTINCT COALESCE(p.listener_id::text, 'anon:' || p.id::text)
      )::INTEGER AS total_listeners,
      CASE
        WHEN COALESCE(AVG(NULLIF(p.track_duration_seconds, 0)), 0) > 0 THEN
          LEAST(
            100,
            ROUND(
              (AVG(p.duration_seconds) / AVG(NULLIF(p.track_duration_seconds, 0))) * 100,
              1
            )
          )
        ELSE 0
      END::NUMERIC AS avg_listen_percent
    FROM plays p
  ),
  top_track AS (
    SELECT track_id, play_count
    FROM per_track
    ORDER BY play_count DESC, avg_listen_percent DESC
    LIMIT 1
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'track_id', pt.track_id,
      'play_count', pt.play_count,
      'listener_count', pt.listener_count,
      'avg_duration_seconds', pt.avg_duration_seconds,
      'avg_listen_percent', pt.avg_listen_percent,
      'completion_rate', pt.completion_rate
    )
    ORDER BY pt.play_count DESC
  )
  INTO v_tracks
  FROM per_track pt;

  SELECT COALESCE(COUNT(*)::BIGINT, 0)
  INTO v_page_views
  FROM public.profile_page_views ppv
  WHERE ppv.profile_id = p_owner_id
    AND ppv.viewed_at >= p_from
    AND ppv.viewed_at < p_to
    AND (
      p_collection_id IS NULL
      OR ppv.page_type = 'collection' AND ppv.resource_id = p_collection_id
      OR ppv.page_type = 'track' AND ppv.resource_id = ANY (p_track_ids)
    );

  SELECT jsonb_build_object(
    'total_plays', COALESCE(ss.total_plays, 0),
    'total_listeners', COALESCE(ss.total_listeners, 0),
    'avg_listen_percent', COALESCE(ss.avg_listen_percent, 0),
    'page_views', v_page_views,
    'top_track_id', tt.track_id,
    'top_track_plays', COALESCE(tt.play_count, 0)
  )
  INTO v_summary
  FROM scope_stats ss
  LEFT JOIN top_track tt ON true;

  RETURN jsonb_build_object(
    'summary', COALESCE(v_summary, jsonb_build_object(
      'total_plays', 0,
      'total_listeners', 0,
      'avg_listen_percent', 0,
      'page_views', v_page_views,
      'top_track_id', NULL,
      'top_track_plays', 0
    )),
    'tracks', COALESCE(v_tracks, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_track_analytics(UUID, BIGINT[], TIMESTAMPTZ, TIMESTAMPTZ, INTEGER) TO authenticated;
