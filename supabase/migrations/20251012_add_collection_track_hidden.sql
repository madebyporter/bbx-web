-- Add hidden column to collections_sounds for version selection
-- When true, this version is hidden from the collection and won't play in the queue

ALTER TABLE public.collections_sounds 
ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT false;

-- Index for fast filtering
CREATE INDEX IF NOT EXISTS idx_collections_sounds_hidden 
  ON public.collections_sounds(collection_id, hidden);

COMMENT ON COLUMN public.collections_sounds.hidden IS 
  'When true, this track version is hidden from the collection view and excluded from playback. Used for version selection - by default, only the latest version is visible.';

