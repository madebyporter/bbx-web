-- Optional YouTube upload title (SEO); falls back to sounds.title when empty.
ALTER TABLE public.sounds
  ADD COLUMN IF NOT EXISTS youtube_title text;

COMMENT ON COLUMN public.sounds.youtube_title IS
  'Optional YouTube upload title (SEO); falls back to title when empty.';
