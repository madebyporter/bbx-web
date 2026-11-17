-- Allow YouTube as a track-sync provider alongside SoundCloud.
-- Ask before applying to hosted Supabase.

ALTER TABLE public.user_integrations
  DROP CONSTRAINT IF EXISTS user_integrations_provider_check;

ALTER TABLE public.user_integrations
  ADD CONSTRAINT user_integrations_provider_check
  CHECK (provider IN ('soundcloud', 'youtube'));

ALTER TABLE public.track_platform_syncs
  DROP CONSTRAINT IF EXISTS track_platform_syncs_provider_check;

ALTER TABLE public.track_platform_syncs
  ADD CONSTRAINT track_platform_syncs_provider_check
  CHECK (provider IN ('soundcloud', 'youtube'));

UPDATE public.plans
SET
  features = CASE
    WHEN features @> '["Track sync to YouTube"]'::jsonb THEN features
    ELSE COALESCE(features, '[]'::jsonb) || '["Track sync to YouTube"]'::jsonb
  END,
  updated_at = now()
WHERE slug = 'pro';
