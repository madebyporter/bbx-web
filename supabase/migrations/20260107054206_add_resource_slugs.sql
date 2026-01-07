-- Migration: Add slug column to resources table
-- Date: 2026-01-07

-- ============================================================================
-- ADD SLUG COLUMN TO RESOURCES TABLE
-- ============================================================================

-- Add slug column to resources table
ALTER TABLE public.resources 
ADD COLUMN IF NOT EXISTS slug TEXT;

-- Create unique index on slug for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_resources_slug ON public.resources(slug) WHERE slug IS NOT NULL;

-- ============================================================================
-- FUNCTION TO GENERATE UNIQUE SLUG
-- ============================================================================

-- Function to generate a URL-friendly slug from a name
CREATE OR REPLACE FUNCTION generate_resource_slug(name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN lower(regexp_replace(regexp_replace(name, '[^a-z0-9]+', '-', 'gi'), '^-|-$', '', 'g'));
END;
$$;

-- Function to generate a unique slug by appending a number if needed
CREATE OR REPLACE FUNCTION generate_unique_resource_slug(base_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug TEXT;
  unique_slug TEXT;
  counter INTEGER := 1;
BEGIN
  base_slug := generate_resource_slug(base_name);
  unique_slug := base_slug;
  
  -- Check if slug exists, if so append counter
  WHILE EXISTS (SELECT 1 FROM public.resources WHERE slug = unique_slug) LOOP
    unique_slug := base_slug || '-' || counter;
    counter := counter + 1;
  END LOOP;
  
  RETURN unique_slug;
END;
$$;

-- ============================================================================
-- BACKFILL EXISTING RESOURCES WITH SLUGS
-- ============================================================================

-- Update all existing resources that don't have slugs
DO $$
DECLARE
  resource_record RECORD;
  new_slug TEXT;
BEGIN
  FOR resource_record IN 
    SELECT id, name FROM public.resources WHERE slug IS NULL OR slug = ''
  LOOP
    new_slug := generate_unique_resource_slug(resource_record.name);
    UPDATE public.resources 
    SET slug = new_slug 
    WHERE id = resource_record.id;
  END LOOP;
END $$;

