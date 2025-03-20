-- Create resource_types table
CREATE TABLE IF NOT EXISTS public.resource_types (
  id SERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert initial resource types
INSERT INTO public.resource_types (slug, display_name) VALUES
  ('software', 'Software'),
  ('sounds_kits', 'Sounds & Kits'),
  ('hardware', 'Hardware'),
  ('sync', 'Sync Libraries'),
  ('tutorials', 'Tutorials');

-- Add type_id column to resources table
ALTER TABLE public.resources 
  ADD COLUMN IF NOT EXISTS type_id INTEGER REFERENCES public.resource_types(id);

-- Migrate existing data
UPDATE public.resources 
  SET type_id = (SELECT id FROM resource_types WHERE slug = 'software')
  WHERE type = 'software';

UPDATE public.resources 
  SET type_id = (SELECT id FROM resource_types WHERE slug = 'sounds_kits')
  WHERE type = 'sounds_kits';

-- Make type_id required after migration
ALTER TABLE public.resources 
  ALTER COLUMN type_id SET NOT NULL;

-- Drop old type column (optional, can keep for reference)
-- ALTER TABLE public.resources DROP COLUMN type;

-- Enable RLS
ALTER TABLE public.resource_types ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view resource types
CREATE POLICY "Anyone can view resource types" 
  ON public.resource_types FOR SELECT 
  USING (true); 