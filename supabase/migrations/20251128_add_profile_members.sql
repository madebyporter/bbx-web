-- Migration: Create profile_members table for profile-level memberships
-- Date: 2025-11-28

-- Create profile_members table
CREATE TABLE IF NOT EXISTS public.profile_members (
  id SERIAL PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, member_id)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_profile_members_profile_id 
ON public.profile_members(profile_id);

CREATE INDEX IF NOT EXISTS idx_profile_members_member_id 
ON public.profile_members(member_id);

-- Enable Row Level Security
ALTER TABLE public.profile_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Members can view their memberships" ON public.profile_members;
DROP POLICY IF EXISTS "Profile owners can view members" ON public.profile_members;
DROP POLICY IF EXISTS "Profile owners can invite members" ON public.profile_members;
DROP POLICY IF EXISTS "Profile owners can remove members" ON public.profile_members;

-- RLS Policies for profile_members

-- Members can view their own memberships (where they are the member)
CREATE POLICY "Members can view their memberships"
ON public.profile_members FOR SELECT
USING (member_id = auth.uid());

-- Profile owners can view all members of their profile
CREATE POLICY "Profile owners can view members"
ON public.profile_members FOR SELECT
USING (profile_id = auth.uid());

-- Profile owners can invite members to their profile
CREATE POLICY "Profile owners can invite members"
ON public.profile_members FOR INSERT
WITH CHECK (
  profile_id = auth.uid()
  AND invited_by = auth.uid()
);

-- Profile owners can remove members from their profile
CREATE POLICY "Profile owners can remove members"
ON public.profile_members FOR DELETE
USING (profile_id = auth.uid());

