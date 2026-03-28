-- Migration: Add sound lineage + Studio sync metadata
-- Date: 2026-03-28
--
-- Goal:
-- 1) Auto-detect prior versions when new sounds are inserted
-- 2) Persist lineage chain (parent/root) for version-control workflows
-- 3) Add ingestion metadata so BBX Studio can sync to web cleanly

-- ============================================================================
-- SOUNDS TABLE: LINEAGE + SYNC COLUMNS
-- ============================================================================

ALTER TABLE public.sounds
ADD COLUMN IF NOT EXISTS parent_sound_id BIGINT REFERENCES public.sounds(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS lineage_root_sound_id BIGINT REFERENCES public.sounds(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS source_client TEXT DEFAULT 'web',
ADD COLUMN IF NOT EXISTS source_project_ref TEXT,
ADD COLUMN IF NOT EXISTS source_revision_ref TEXT;

UPDATE public.sounds
SET source_client = 'web'
WHERE source_client IS NULL OR btrim(source_client) = '';

ALTER TABLE public.sounds
ALTER COLUMN source_client SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sounds_source_client_check'
  ) THEN
    ALTER TABLE public.sounds
    ADD CONSTRAINT sounds_source_client_check
    CHECK (source_client IN ('web', 'studio', 'api'));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_sounds_parent_sound_id
  ON public.sounds(parent_sound_id);

CREATE INDEX IF NOT EXISTS idx_sounds_lineage_root_sound_id
  ON public.sounds(lineage_root_sound_id);

CREATE INDEX IF NOT EXISTS idx_sounds_user_track_group_created
  ON public.sounds(user_id, track_group_name, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_sounds_user_title_created
  ON public.sounds(user_id, lower(title), created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_sounds_source_client
  ON public.sounds(source_client);

-- ============================================================================
-- HELPERS
-- ============================================================================

-- Parse version strings like "v1", "v1.0", "1.2" into numeric.
CREATE OR REPLACE FUNCTION public.parse_sound_version_number(version_text TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  cleaned TEXT;
BEGIN
  IF version_text IS NULL OR btrim(version_text) = '' THEN
    RETURN NULL;
  END IF;

  cleaned := lower(btrim(version_text));
  cleaned := regexp_replace(cleaned, '^v', '');

  IF cleaned ~ '^\d+(\.\d+)?$' THEN
    RETURN cleaned::NUMERIC;
  END IF;

  RETURN NULL;
END;
$$;

-- ============================================================================
-- TRIGGER: AUTO-PREPARE VERSION LINEAGE ON INSERT
-- ============================================================================

CREATE OR REPLACE FUNCTION public.prepare_sound_lineage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  previous_sound RECORD;
  max_version NUMERIC;
  inferred_group TEXT;
BEGIN
  NEW.track_group_name := NULLIF(btrim(COALESCE(NEW.track_group_name, '')), '');
  NEW.version := NULLIF(btrim(COALESCE(NEW.version, '')), '');
  NEW.source_client := COALESCE(NULLIF(btrim(COALESCE(NEW.source_client, '')), ''), 'web');

  -- If group name is missing, try inheriting from exact title match (same user).
  IF NEW.track_group_name IS NULL AND NEW.title IS NOT NULL THEN
    SELECT s.track_group_name
      INTO inferred_group
    FROM public.sounds s
    WHERE s.user_id = NEW.user_id
      AND lower(s.title) = lower(NEW.title)
      AND s.track_group_name IS NOT NULL
    ORDER BY s.created_at DESC, s.id DESC
    LIMIT 1;

    IF inferred_group IS NOT NULL THEN
      NEW.track_group_name := inferred_group;
    END IF;
  END IF;

  -- Find prior versions by group (preferred) or exact title fallback.
  IF NEW.track_group_name IS NOT NULL THEN
    SELECT s.id, s.lineage_root_sound_id, s.version
      INTO previous_sound
    FROM public.sounds s
    WHERE s.user_id = NEW.user_id
      AND s.track_group_name = NEW.track_group_name
    ORDER BY s.created_at DESC, s.id DESC
    LIMIT 1;

    SELECT max(public.parse_sound_version_number(s.version))
      INTO max_version
    FROM public.sounds s
    WHERE s.user_id = NEW.user_id
      AND s.track_group_name = NEW.track_group_name;
  ELSIF NEW.title IS NOT NULL THEN
    SELECT s.id, s.lineage_root_sound_id, s.version
      INTO previous_sound
    FROM public.sounds s
    WHERE s.user_id = NEW.user_id
      AND lower(s.title) = lower(NEW.title)
    ORDER BY s.created_at DESC, s.id DESC
    LIMIT 1;

    SELECT max(public.parse_sound_version_number(s.version))
      INTO max_version
    FROM public.sounds s
    WHERE s.user_id = NEW.user_id
      AND lower(s.title) = lower(NEW.title);
  END IF;

  IF previous_sound.id IS NOT NULL THEN
    NEW.parent_sound_id := COALESCE(NEW.parent_sound_id, previous_sound.id);
    NEW.lineage_root_sound_id := COALESCE(
      NEW.lineage_root_sound_id,
      previous_sound.lineage_root_sound_id,
      previous_sound.id
    );
  END IF;

  -- Ensure root is set for first version rows.
  NEW.lineage_root_sound_id := COALESCE(NEW.lineage_root_sound_id, NEW.id);

  -- Normalize version format and auto-suggest next when absent.
  IF NEW.version IS NULL THEN
    IF max_version IS NOT NULL THEN
      NEW.version := 'v' || (floor(max_version)::INT + 1)::TEXT || '.0';
    ELSE
      NEW.version := 'v1.0';
    END IF;
  ELSIF NEW.version !~* '^v' THEN
    NEW.version := 'v' || NEW.version;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prepare_sound_lineage ON public.sounds;

CREATE TRIGGER trg_prepare_sound_lineage
BEFORE INSERT ON public.sounds
FOR EACH ROW
EXECUTE FUNCTION public.prepare_sound_lineage();

-- ============================================================================
-- BACKFILL EXISTING SOUNDS LINEAGE
-- ============================================================================

WITH ordered AS (
  SELECT
    s.id,
    first_value(s.id) OVER (
      PARTITION BY s.user_id, COALESCE(NULLIF(s.track_group_name, ''), lower(s.title), 'sound:' || s.id::TEXT)
      ORDER BY s.created_at, s.id
    ) AS root_id,
    lag(s.id) OVER (
      PARTITION BY s.user_id, COALESCE(NULLIF(s.track_group_name, ''), lower(s.title), 'sound:' || s.id::TEXT)
      ORDER BY s.created_at, s.id
    ) AS parent_id
  FROM public.sounds s
)
UPDATE public.sounds target
SET
  lineage_root_sound_id = COALESCE(target.lineage_root_sound_id, ordered.root_id, target.id),
  parent_sound_id = COALESCE(target.parent_sound_id, ordered.parent_id)
FROM ordered
WHERE target.id = ordered.id;

UPDATE public.sounds
SET lineage_root_sound_id = id
WHERE lineage_root_sound_id IS NULL;

-- Avoid accidental self-parent links.
UPDATE public.sounds
SET parent_sound_id = NULL
WHERE parent_sound_id = id;

-- ============================================================================
-- REVISION SNAPSHOT UPGRADE
-- ============================================================================

-- Keep ledger snapshots aware of lineage + sync metadata.
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
    'parent_sound_id', s.parent_sound_id,
    'lineage_root_sound_id', s.lineage_root_sound_id,
    'source_client', s.source_client,
    'source_project_ref', s.source_project_ref,
    'source_revision_ref', s.source_revision_ref,
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

