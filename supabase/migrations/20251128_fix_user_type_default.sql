-- Migration: Fix user_type default value for new user signups
-- Date: 2025-11-28
-- This ensures new users get a default user_type value when their profile is created

-- Set default value for user_type column (for new user signups)
-- This will be used when triggers or functions create user_profiles records
ALTER TABLE public.user_profiles 
ALTER COLUMN user_type SET DEFAULT 'creator'::user_type;

-- If the column is NOT NULL (which it should be), ensure it has the default
-- This handles cases where the column might not have had a default set
DO $$
BEGIN
  -- Check if column has a default, if not, set it
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_attrdef ad
    JOIN pg_attribute a ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
    JOIN pg_class c ON a.attrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND c.relname = 'user_profiles'
      AND a.attname = 'user_type'
  ) THEN
    ALTER TABLE public.user_profiles 
    ALTER COLUMN user_type SET DEFAULT 'creator'::user_type;
    RAISE NOTICE 'Set default value for user_type column';
  ELSE
    RAISE NOTICE 'user_type column already has a default value';
  END IF;
END $$;

