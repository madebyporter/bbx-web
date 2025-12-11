-- Migration: Clean up and fix user_profiles RLS policies
-- Date: 2025-11-28
-- This is a cleanup migration to ensure RLS policies work correctly

-- Step 1: Drop ALL existing policies
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_profiles', r.policyname);
    RAISE NOTICE 'Dropped policy: %', r.policyname;
  END LOOP;
END $$;

-- Step 2: Ensure RLS is enabled
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Step 2.5: Grant necessary permissions on the table
GRANT SELECT ON public.user_profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON public.user_profiles TO authenticated;

-- Grant sequence permissions if the sequence exists (user_profiles uses UUID, so no sequence needed, but check anyway)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'user_profiles_id_seq') THEN
    GRANT USAGE ON SEQUENCE public.user_profiles_id_seq TO authenticated;
  END IF;
END $$;

-- Step 3: Create clean policies

-- SELECT: Allow anyone to view profiles (for public pages)
CREATE POLICY "public_profiles_select"
ON public.user_profiles
FOR SELECT
USING (true);

-- UPDATE: Users can only update their own profile
CREATE POLICY "users_update_own_profile"
ON public.user_profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- INSERT: Users can insert their own profile
CREATE POLICY "users_insert_own_profile"
ON public.user_profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Step 4: Verify policies exist
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE schemaname = 'public' 
  AND tablename = 'user_profiles';
  
  IF policy_count < 3 THEN
    RAISE EXCEPTION 'Expected 3 policies, found %', policy_count;
  END IF;
  
  RAISE NOTICE 'Successfully created % policies for user_profiles', policy_count;
END $$;

