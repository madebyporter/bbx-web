-- Latest generated track video stored on R2 (paid cloud save).
ALTER TABLE public.sounds
  ADD COLUMN IF NOT EXISTS video_path text,
  ADD COLUMN IF NOT EXISTS video_provider text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sounds_video_provider_check'
  ) THEN
    ALTER TABLE public.sounds
      ADD CONSTRAINT sounds_video_provider_check
      CHECK (video_provider IS NULL OR video_provider IN ('r2'));
  END IF;
END $$;

COMMENT ON COLUMN public.sounds.video_path IS
  'R2 object key for the latest generated track video (paid cloud save).';

COMMENT ON COLUMN public.sounds.video_provider IS
  'Storage provider for video_path (r2).';
