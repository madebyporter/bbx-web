-- Migration: Create resource_comments table
-- Date: 2026-01-07

-- ============================================================================
-- CREATE RESOURCE_COMMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.resource_comments (
  id BIGSERIAL PRIMARY KEY,
  resource_id BIGINT NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_resource_comments_resource_id 
  ON public.resource_comments(resource_id);

CREATE INDEX IF NOT EXISTS idx_resource_comments_user_id 
  ON public.resource_comments(user_id);

CREATE INDEX IF NOT EXISTS idx_resource_comments_created_at 
  ON public.resource_comments(created_at DESC);

-- ============================================================================
-- UPDATE TRIGGER FOR updated_at
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_resource_comment_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_resource_comment_updated_at
  BEFORE UPDATE ON public.resource_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_resource_comment_updated_at();

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.resource_comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view resource comments" ON public.resource_comments;
DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.resource_comments;
DROP POLICY IF EXISTS "Users can update own comments" ON public.resource_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON public.resource_comments;

-- RLS Policies for resource_comments
-- Anyone can view comments
CREATE POLICY "Anyone can view resource comments"
  ON public.resource_comments FOR SELECT
  USING (true);

-- Authenticated users can create comments
CREATE POLICY "Authenticated users can create comments"
  ON public.resource_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
  ON public.resource_comments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
  ON public.resource_comments FOR DELETE
  USING (auth.uid() = user_id);

