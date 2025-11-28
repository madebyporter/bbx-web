-- Migration: Simplify user types from producer/engineer/writer/performer/other to creator/audio_pro
-- Date: 2025-11-28

-- Step 1: Get the old enum type name and rename it if needed to avoid conflicts
DO $$
DECLARE
  old_enum_name text;
BEGIN
  -- Find the enum type currently used by user_type column
  SELECT t.typname INTO old_enum_name
  FROM pg_attribute a
  JOIN pg_type t ON a.atttypid = t.oid
  JOIN pg_class c ON a.attrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public'
    AND c.relname = 'user_profiles'
    AND a.attname = 'user_type'
    AND t.typtype = 'e'
  LIMIT 1;
  
  -- If old enum is named 'user_type', rename it first to avoid conflict
  IF old_enum_name = 'user_type' THEN
    BEGIN
      ALTER TYPE user_type RENAME TO user_type_old;
      RAISE NOTICE 'Renamed old user_type enum to user_type_old';
      old_enum_name := 'user_type_old';
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Could not rename old enum: %', SQLERRM;
    END;
  END IF;
  
  -- Store it in a temporary table for later use
  IF old_enum_name IS NOT NULL THEN
    CREATE TEMP TABLE IF NOT EXISTS migration_temp (old_enum text);
    DELETE FROM migration_temp;
    INSERT INTO migration_temp VALUES (old_enum_name);
    RAISE NOTICE 'Stored old enum type name: %', old_enum_name;
  END IF;
END $$;

-- Step 2: Create new enum type with simplified values
CREATE TYPE user_type_simplified AS ENUM ('creator', 'audio_pro');

-- Step 3: Add temporary column with new enum type
ALTER TABLE public.user_profiles 
ADD COLUMN user_type_temp user_type_simplified;

-- Step 4: Map existing values to new values
-- producer, engineer → audio_pro
UPDATE public.user_profiles
SET user_type_temp = 'audio_pro'::user_type_simplified
WHERE user_type::text IN ('producer', 'engineer');

-- writer, performer, other → creator
UPDATE public.user_profiles
SET user_type_temp = 'creator'::user_type_simplified
WHERE user_type::text IN ('writer', 'performer', 'other');

-- NULL values → creator (default)
UPDATE public.user_profiles
SET user_type_temp = 'creator'::user_type_simplified
WHERE user_type IS NULL;

-- Step 5: Drop old column (this removes dependency on old enum)
ALTER TABLE public.user_profiles 
DROP COLUMN user_type;

-- Step 6: Rename temp column to original name
ALTER TABLE public.user_profiles 
RENAME COLUMN user_type_temp TO user_type;

-- Step 7: Drop old enum type (should work now since column is dropped)
DO $$
DECLARE
  old_enum_name text;
BEGIN
  -- Get the old enum name from temp table
  SELECT old_enum INTO old_enum_name FROM migration_temp LIMIT 1;
  
  IF old_enum_name IS NOT NULL AND old_enum_name != 'user_type_simplified' THEN
    -- Try to drop it (we already renamed it in step 1 if it was 'user_type')
    BEGIN
      EXECUTE 'DROP TYPE IF EXISTS ' || quote_ident(old_enum_name) || ' CASCADE';
      RAISE NOTICE 'Dropped old enum type: %', old_enum_name;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Could not drop enum type % (may be used elsewhere): %', old_enum_name, SQLERRM;
    END;
  END IF;
  
  -- Clean up temp table
  DROP TABLE IF EXISTS migration_temp;
END $$;

-- Step 8: Rename new enum to standard name
ALTER TYPE user_type_simplified RENAME TO user_type;

