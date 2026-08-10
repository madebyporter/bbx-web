-- Add optional marketing/description copy for software and kit detail pages
ALTER TABLE public.resources
ADD COLUMN IF NOT EXISTS description TEXT;
