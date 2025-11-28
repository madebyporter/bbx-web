-- Migration: Fix or remove trigger that creates user_profiles
-- Date: 2025-11-28
-- This migration fixes the trigger function to work even if user_type enum doesn't exist
-- Profile creation is also handled in application code (see useAuth.ts and confirm.vue)

-- First, try to drop the trigger and function (preferred approach)
DO $$
BEGIN
  -- Try to drop trigger (may not have permissions on auth schema)
  BEGIN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    RAISE NOTICE 'Dropped trigger on_auth_user_created if it existed';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'Cannot drop trigger on auth.users (insufficient privileges) - will fix function instead';
    WHEN OTHERS THEN
      RAISE NOTICE 'Error dropping trigger: %', SQLERRM;
  END;
  
  -- Drop the function (this we should be able to do)
  DROP FUNCTION IF EXISTS public.handle_new_user();
  RAISE NOTICE 'Dropped function handle_new_user if it existed';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in cleanup: %', SQLERRM;
END $$;

-- If we couldn't drop the trigger, create a fixed version of the function
-- This version doesn't use the enum type directly to avoid errors
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_type_value TEXT;
  username_value TEXT;
  display_name_value TEXT;
BEGIN
  -- Extract user_type from user_metadata, default to 'creator' if not present
  IF NEW.raw_user_meta_data->>'user_type' = 'audio_pro' THEN
    user_type_value := 'audio_pro';
  ELSE
    user_type_value := 'creator';
  END IF;
  
  -- Generate username and display_name from email
  username_value := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  );
  
  display_name_value := COALESCE(
    NEW.raw_user_meta_data->>'display_name',
    split_part(NEW.email, '@', 1)
  );
  
  -- Insert into user_profiles using dynamic SQL to handle enum type safely
  -- This avoids compilation errors if the enum doesn't exist
  EXECUTE format(
    'INSERT INTO public.user_profiles (id, user_type, username, display_name)
     VALUES ($1, $2::user_type, $3, $4)
     ON CONFLICT (id) DO UPDATE
     SET 
       user_type = EXCLUDED.user_type,
       username = COALESCE(EXCLUDED.username, user_profiles.username),
       display_name = COALESCE(EXCLUDED.display_name, user_profiles.display_name)'
  ) USING NEW.id, user_type_value, username_value, display_name_value;
  
  RETURN NEW;
EXCEPTION
  WHEN undefined_object THEN
    -- Enum type doesn't exist - skip user_type and let default handle it
    INSERT INTO public.user_profiles (id, username, display_name)
    VALUES (NEW.id, username_value, display_name_value)
    ON CONFLICT (id) DO UPDATE
    SET 
      username = COALESCE(EXCLUDED.username, user_profiles.username),
      display_name = COALESCE(EXCLUDED.display_name, user_profiles.display_name);
    RETURN NEW;
  WHEN OTHERS THEN
    -- If profile creation fails for any reason, log but don't fail user creation
    RAISE WARNING 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: We don't recreate the trigger here - if it was dropped, profile creation
-- will be handled entirely in application code. If it still exists, the fixed
-- function above will work correctly.

