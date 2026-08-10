ALTER TABLE public.sounds
  ADD COLUMN IF NOT EXISTS storage_provider text NOT NULL DEFAULT 'supabase'
  CHECK (storage_provider IN ('supabase', 'r2'));
