-- Artwork storage provider: route new artwork to R2 while legacy stays on Supabase

ALTER TABLE public.sounds
  ADD COLUMN IF NOT EXISTS artwork_provider text NOT NULL DEFAULT 'supabase'
  CHECK (artwork_provider IN ('supabase', 'r2'));

ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS artwork_provider text NOT NULL DEFAULT 'supabase'
  CHECK (artwork_provider IN ('supabase', 'r2'));
