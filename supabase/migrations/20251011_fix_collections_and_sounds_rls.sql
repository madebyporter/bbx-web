-- Migration: Add RLS policies for collections and sounds tables
-- Date: 2025-10-11

-- ============================================================================
-- ADD RLS POLICIES FOR COLLECTIONS TABLE (if not already present)
-- ============================================================================

-- Enable RLS on collections table
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all collections" ON public.collections;
DROP POLICY IF EXISTS "Users can create own collections" ON public.collections;
DROP POLICY IF EXISTS "Users can update own collections" ON public.collections;
DROP POLICY IF EXISTS "Users can delete own collections" ON public.collections;

-- RLS Policies for collections
CREATE POLICY "Users can view all collections"
  ON public.collections FOR SELECT
  USING (true);

CREATE POLICY "Users can create own collections"
  ON public.collections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own collections"
  ON public.collections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own collections"
  ON public.collections FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- ADD RLS POLICIES FOR SOUNDS TABLE
-- ============================================================================

-- Enable RLS on sounds table
ALTER TABLE public.sounds ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view sounds" ON public.sounds;
DROP POLICY IF EXISTS "Users can insert own sounds" ON public.sounds;
DROP POLICY IF EXISTS "Users can update own sounds" ON public.sounds;
DROP POLICY IF EXISTS "Users can delete own sounds" ON public.sounds;

-- Policy: Anyone can view all sounds (for public playback/browsing)
CREATE POLICY "Anyone can view sounds"
  ON public.sounds FOR SELECT
  USING (true);

-- Policy: Authenticated users can insert their own sounds
CREATE POLICY "Users can insert own sounds"
  ON public.sounds FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own sounds
CREATE POLICY "Users can update own sounds"
  ON public.sounds FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own sounds
CREATE POLICY "Users can delete own sounds"
  ON public.sounds FOR DELETE
  USING (auth.uid() = user_id);
