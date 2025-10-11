-- Fix: Add UPDATE policy for sounds table
-- Run this in Supabase Dashboard SQL Editor

-- Enable RLS on sounds table (if not already enabled)
ALTER TABLE public.sounds ENABLE ROW LEVEL SECURITY;

-- Drop existing UPDATE policy if it exists
DROP POLICY IF EXISTS "Users can update own sounds" ON public.sounds;

-- Create UPDATE policy: Users can update their own sounds
CREATE POLICY "Users can update own sounds"
  ON public.sounds FOR UPDATE
  USING (auth.uid() = user_id);

-- Verify the policy was created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'sounds' AND cmd = 'UPDATE';

