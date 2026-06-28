-- Migration: Add immutable sound revision history
-- Date: 2026-03-28
--
-- Goal:
-- Keep a durable version-control record of song metadata changes in `public.sounds`
-- without depending on manual v1/v2 file naming conventions.

-- ============================================================================
-- SOUND REVISIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sound_revisions (
  id BIGSERIAL PRIMARY KEY,
  sound_id BIGINT NOT NULL REFERENCES public.sounds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  revision_number INTEGER NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('create', 'update')),
  changed_fields TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  previous_snapshot JSONB,
  current_snapshot JSONB NOT NULL,
  metadata_diff JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(sound_id, revision_number)
);

CREATE INDEX IF NOT EXISTS idx_sound_revisions_sound_id_created_at
  ON public.sound_revisions(sound_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sound_revisions_user_id_created_at
  ON public.sound_revisions(user_id, created_at DESC);

-- ============================================================================
-- RLS
-- ============================================================================

ALTER TABLE public.sound_revisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view sound revisions based on sound visibility" ON public.sound_revisions;

-- Users can see revisions if they can see the parent sound.
CREATE POLICY "Users can view sound revisions based on sound visibility"
ON public.sound_revisions
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.sounds s
    WHERE s.id = sound_revisions.sound_id
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
  )
);

-- ============================================================================
-- UTIL FUNCTIONS
-- ============================================================================

-- Build canonical metadata snapshot for revision history.
CREATE OR REPLACE FUNCTION public.build_sound_snapshot(s public.sounds)
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'id', s.id,
    'user_id', s.user_id,
    'title', s.title,
    'artist', s.artist,
    'version', s.version,
    'track_group_name', s.track_group_name,
    'genre', s.genre,
    'mood', s.mood,
    'bpm', s.bpm,
    'key', s.key,
    'year', s.year,
    'status_id', s.status_id,
    'is_public', s.is_public,
    'collection_names', s.collection_names,
    'storage_path', s.storage_path
  );
$$;

-- Return list of changed top-level keys between snapshots.
CREATE OR REPLACE FUNCTION public.jsonb_changed_keys(old_data JSONB, new_data JSONB)
RETURNS TEXT[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(array_agg(k ORDER BY k), ARRAY[]::TEXT[])
  FROM (
    SELECT key AS k FROM jsonb_object_keys(COALESCE(old_data, '{}'::JSONB))
    UNION
    SELECT key AS k FROM jsonb_object_keys(COALESCE(new_data, '{}'::JSONB))
  ) keys
  WHERE COALESCE(old_data -> k, 'null'::JSONB) IS DISTINCT FROM COALESCE(new_data -> k, 'null'::JSONB);
$$;

-- Return structured per-key diff object:
-- { "fieldName": { "from": ..., "to": ... }, ... }
CREATE OR REPLACE FUNCTION public.jsonb_diff_map(old_data JSONB, new_data JSONB)
RETURNS JSONB
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(jsonb_object_agg(k, jsonb_build_object(
    'from', old_data -> k,
    'to', new_data -> k
  )), '{}'::JSONB)
  FROM (
    SELECT key AS k FROM jsonb_object_keys(COALESCE(old_data, '{}'::JSONB))
    UNION
    SELECT key AS k FROM jsonb_object_keys(COALESCE(new_data, '{}'::JSONB))
  ) keys
  WHERE COALESCE(old_data -> k, 'null'::JSONB) IS DISTINCT FROM COALESCE(new_data -> k, 'null'::JSONB);
$$;

-- ============================================================================
-- TRIGGER: AUTO-LOG REVISIONS FOR SOUNDS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.log_sound_revision()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_snapshot JSONB;
  old_snapshot JSONB;
  changed_fields TEXT[];
  diff_map JSONB;
  next_revision_number INTEGER;
BEGIN
  IF TG_OP = 'INSERT' THEN
    new_snapshot := public.build_sound_snapshot(NEW);

    INSERT INTO public.sound_revisions (
      sound_id,
      user_id,
      revision_number,
      change_type,
      changed_fields,
      previous_snapshot,
      current_snapshot,
      metadata_diff
    )
    VALUES (
      NEW.id,
      NEW.user_id,
      1,
      'create',
      ARRAY[]::TEXT[],
      NULL,
      new_snapshot,
      '{}'::JSONB
    );

    RETURN NEW;
  END IF;

  -- UPDATE path
  -- Serialize revision numbering per sound to avoid concurrent conflicts.
  PERFORM pg_advisory_xact_lock(NEW.id::BIGINT);

  new_snapshot := public.build_sound_snapshot(NEW);
  old_snapshot := public.build_sound_snapshot(OLD);
  changed_fields := public.jsonb_changed_keys(old_snapshot, new_snapshot);

  -- Skip if no tracked metadata changed.
  IF COALESCE(array_length(changed_fields, 1), 0) = 0 THEN
    RETURN NEW;
  END IF;

  diff_map := public.jsonb_diff_map(old_snapshot, new_snapshot);

  SELECT COALESCE(MAX(sr.revision_number), 0) + 1
    INTO next_revision_number
  FROM public.sound_revisions sr
  WHERE sr.sound_id = NEW.id;

  INSERT INTO public.sound_revisions (
    sound_id,
    user_id,
    revision_number,
    change_type,
    changed_fields,
    previous_snapshot,
    current_snapshot,
    metadata_diff
  )
  VALUES (
    NEW.id,
    NEW.user_id,
    next_revision_number,
    'update',
    changed_fields,
    old_snapshot,
    new_snapshot,
    diff_map
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_sound_revision ON public.sounds;

CREATE TRIGGER trg_log_sound_revision
AFTER INSERT OR UPDATE ON public.sounds
FOR EACH ROW
EXECUTE FUNCTION public.log_sound_revision();

-- ============================================================================
-- BACKFILL: CREATE INITIAL REVISION FOR EXISTING SOUNDS
-- ============================================================================

INSERT INTO public.sound_revisions (
  sound_id,
  user_id,
  revision_number,
  change_type,
  changed_fields,
  previous_snapshot,
  current_snapshot,
  metadata_diff,
  created_at
)
SELECT
  s.id AS sound_id,
  s.user_id,
  1 AS revision_number,
  'create' AS change_type,
  ARRAY[]::TEXT[] AS changed_fields,
  NULL::JSONB AS previous_snapshot,
  public.build_sound_snapshot(s) AS current_snapshot,
  '{}'::JSONB AS metadata_diff,
  NOW()
FROM public.sounds s
WHERE NOT EXISTS (
  SELECT 1
  FROM public.sound_revisions sr
  WHERE sr.sound_id = s.id
);

-- Grant read access to authenticated role (RLS still enforces row visibility).
GRANT SELECT ON public.sound_revisions TO authenticated;
