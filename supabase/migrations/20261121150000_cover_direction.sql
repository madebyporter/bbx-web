-- Optional AI cover direction prompt for reuse / regeneration.
ALTER TABLE public.sounds
  ADD COLUMN IF NOT EXISTS cover_direction text;

ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS cover_direction text;

COMMENT ON COLUMN public.sounds.cover_direction IS
  'Optional AI cover generation direction prompt for reuse/regeneration.';

COMMENT ON COLUMN public.collections.cover_direction IS
  'Optional AI cover generation direction prompt for reuse/regeneration.';
