-- Add title column to sounds table
ALTER TABLE public.sounds 
ADD COLUMN IF NOT EXISTS title TEXT;

-- Update existing records to use filename as title (extract from storage_path)
-- This removes the user_id folder, timestamp prefix, and file extension
UPDATE public.sounds 
SET title = 
  CASE 
    WHEN storage_path IS NOT NULL THEN 
      -- Extract filename, remove timestamp prefix (e.g. "1760207673802-"), and remove extension
      regexp_replace(
        regexp_replace(
          split_part(storage_path, '/', 2), -- Get filename after user_id folder
          '^\d+-',                           -- Remove timestamp prefix
          ''
        ),
        '\.[^.]*$',                          -- Remove file extension
        ''
      )
    ELSE 'Untitled'
  END
WHERE title IS NULL;

