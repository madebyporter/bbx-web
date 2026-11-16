-- Profile discoverability for Producers browse (/producers)
-- is_public = true → listed on /producers (Audio Pros)
-- is_public = false → profile still reachable by direct URL; hidden from directory

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.user_profiles.is_public IS
  'When true, audio_pro profiles appear on /producers. Direct profile URLs still work when false.';

CREATE INDEX IF NOT EXISTS idx_user_profiles_is_public_audio_pro
  ON public.user_profiles (user_type, is_public)
  WHERE user_type = 'audio_pro' AND is_public = true;
