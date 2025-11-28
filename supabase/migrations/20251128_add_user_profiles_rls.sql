-- Migration: Add RLS policies for user_profiles table
-- Date: 2025-11-28
-- This migration adds Row Level Security policies to allow users to view and update their profiles
-- This version drops ALL existing policies first to avoid conflicts from duplicate policies

-- Enable Row Level Security on user_profiles (if not already enabled)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions on the table
GRANT SELECT ON public.user_profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON public.user_profiles TO authenticated;

-- Drop ALL existing policies to start fresh (there are multiple duplicate policies causing conflicts)
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

-- RLS Policies for user_profiles

-- SELECT: Anyone (authenticated or not) can view all profiles
-- This allows public profile pages to work
-- Using 'true' allows both authenticated and anonymous users
CREATE POLICY "Users can view all profiles"
ON public.user_profiles
FOR SELECT
USING (true);

-- UPDATE: Users can only update their own profile
CREATE POLICY "Users can update their own profile"
ON public.user_profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- INSERT: Users can insert their own profile
-- This is needed for profile creation during signup
CREATE POLICY "Users can insert their own profile"
ON public.user_profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Verify policies were created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_profiles'
    AND policyname = 'Users can view all profiles'
  ) THEN
    RAISE EXCEPTION 'Failed to create SELECT policy';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_profiles'
    AND policyname = 'Users can update their own profile'
  ) THEN
    RAISE EXCEPTION 'Failed to create UPDATE policy';
  END IF;
  
  RAISE NOTICE 'All RLS policies for user_profiles created successfully';
END $$;

