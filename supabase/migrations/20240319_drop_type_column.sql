-- Drop the old type column since we've migrated to using type_id
ALTER TABLE public.resources DROP COLUMN IF EXISTS type; 