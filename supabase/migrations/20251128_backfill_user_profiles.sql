-- Migration: Backfill missing user_profiles records and user_type values
-- Date: 2025-11-28
-- This migration creates user_profiles records for users that don't have them
-- and sets user_type to 'creator' for existing users with NULL user_type

-- Step 1: Create user_profiles records for users that don't have them
INSERT INTO public.user_profiles (id, username, display_name, user_type)
SELECT 
  au.id,
  COALESCE(
    split_part(au.email, '@', 1),
    'user_' || substring(au.id::text, 1, 8)
  ) as username,
  COALESCE(
    split_part(au.email, '@', 1),
    'user_' || substring(au.id::text, 1, 8)
  ) as display_name,
  'creator'::user_type as user_type
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
WHERE up.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Step 2: Update existing user_profiles with NULL user_type to 'creator'
UPDATE public.user_profiles
SET user_type = 'creator'::user_type
WHERE user_type IS NULL;

-- Step 3: Verify the backfill
DO $$
DECLARE
  missing_count INTEGER;
  null_type_count INTEGER;
BEGIN
  -- Count users without profiles
  SELECT COUNT(*) INTO missing_count
  FROM auth.users au
  LEFT JOIN public.user_profiles up ON au.id = up.id
  WHERE up.id IS NULL;
  
  -- Count profiles with NULL user_type
  SELECT COUNT(*) INTO null_type_count
  FROM public.user_profiles
  WHERE user_type IS NULL;
  
  IF missing_count > 0 THEN
    RAISE WARNING 'Still % users without profiles after backfill', missing_count;
  END IF;
  
  IF null_type_count > 0 THEN
    RAISE WARNING 'Still % profiles with NULL user_type after backfill', null_type_count;
  END IF;
  
  RAISE NOTICE 'Backfill completed. Missing profiles: %, NULL user_types: %', missing_count, null_type_count;
END $$;

