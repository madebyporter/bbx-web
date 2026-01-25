-- Migration: Create collection_members table for collection-level memberships
-- Date: 2026-01-25

-- Create collection_members table
CREATE TABLE IF NOT EXISTS public.collection_members (
  id SERIAL PRIMARY KEY,
  collection_id INTEGER NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(collection_id, member_id)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_collection_members_collection_id 
ON public.collection_members(collection_id);

CREATE INDEX IF NOT EXISTS idx_collection_members_member_id 
ON public.collection_members(member_id);

-- Enable Row Level Security
ALTER TABLE public.collection_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Members can view their memberships" ON public.collection_members;
DROP POLICY IF EXISTS "Collection owners can view members" ON public.collection_members;
DROP POLICY IF EXISTS "Collection owners can invite members" ON public.collection_members;
DROP POLICY IF EXISTS "Collection owners can remove members" ON public.collection_members;

-- RLS Policies for collection_members

-- Members can view their own memberships (where they are the member)
CREATE POLICY "Members can view their memberships"
ON public.collection_members FOR SELECT
USING (member_id = auth.uid());

-- Collection owners can view all members of their collections
CREATE POLICY "Collection owners can view members"
ON public.collection_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.collections c
    WHERE c.id = collection_members.collection_id
    AND c.user_id = auth.uid()
  )
);

-- Collection owners can invite members to their collections
CREATE POLICY "Collection owners can invite members"
ON public.collection_members FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.collections c
    WHERE c.id = collection_members.collection_id
    AND c.user_id = auth.uid()
  )
  AND invited_by = auth.uid()
);

-- Collection owners can remove members from their collections
CREATE POLICY "Collection owners can remove members"
ON public.collection_members FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.collections c
    WHERE c.id = collection_members.collection_id
    AND c.user_id = auth.uid()
  )
);
