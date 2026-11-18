-- Optional sync/platform description for tracks (manual or AI-generated).
ALTER TABLE public.sounds
  ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN public.sounds.description IS
  'Optional track description used for SoundCloud/YouTube sync; when null, sync auto-builds from metadata.';
