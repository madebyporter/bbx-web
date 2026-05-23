-- Fix: scope_stats CTE was referenced outside its statement scope (42P01)
-- Safe to run on projects that already applied track analytics migrations.

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
