-- SoundCloud track sync: OAuth connections + per-track sync status
-- Also enable track_sync entitlement on Pro (public paid plan).
-- Ask before applying to hosted Supabase.

-- ---------------------------------------------------------------------------
-- user_integrations: OAuth tokens per user/provider
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  access_token_enc TEXT NOT NULL,
  refresh_token_enc TEXT,
  expires_at TIMESTAMPTZ,
  provider_user_id TEXT,
  provider_username TEXT,
  scopes TEXT,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_integrations_provider_check CHECK (provider IN ('soundcloud', 'youtube')),
  CONSTRAINT user_integrations_user_provider_unique UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_user_integrations_user_id
  ON public.user_integrations(user_id);

COMMENT ON TABLE public.user_integrations IS
  'Third-party OAuth connections. Tokens stored encrypted at the application layer.';

ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;

-- Clients never read/write tokens directly; service role only.
REVOKE ALL ON public.user_integrations FROM anon, authenticated;
GRANT ALL ON public.user_integrations TO service_role;

-- ---------------------------------------------------------------------------
-- track_platform_syncs: per-track sync state per provider
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.track_platform_syncs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sound_id BIGINT NOT NULL REFERENCES public.sounds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  external_id TEXT,
  external_permalink TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  last_synced_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT track_platform_syncs_provider_check CHECK (provider IN ('soundcloud', 'youtube')),
  CONSTRAINT track_platform_syncs_status_check CHECK (status IN ('pending', 'synced', 'failed')),
  CONSTRAINT track_platform_syncs_sound_provider_unique UNIQUE (sound_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_track_platform_syncs_user_id
  ON public.track_platform_syncs(user_id);

CREATE INDEX IF NOT EXISTS idx_track_platform_syncs_sound_id
  ON public.track_platform_syncs(sound_id);

COMMENT ON TABLE public.track_platform_syncs IS
  'Tracks pushed to third-party platforms and their sync status.';

ALTER TABLE public.track_platform_syncs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own track syncs"
  ON public.track_platform_syncs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Mutations go through service role / API routes.
REVOKE INSERT, UPDATE, DELETE ON public.track_platform_syncs FROM anon, authenticated;
GRANT SELECT ON public.track_platform_syncs TO authenticated;
GRANT ALL ON public.track_platform_syncs TO service_role;

-- ---------------------------------------------------------------------------
-- Pro plan: enable track_sync entitlement + feature copy
-- ---------------------------------------------------------------------------
UPDATE public.plans
SET
  entitlements = jsonb_set(COALESCE(entitlements, '{}'::jsonb), '{track_sync}', 'true'::jsonb, true),
  features = CASE
    WHEN features @> '["Track sync to SoundCloud"]'::jsonb THEN features
    ELSE COALESCE(features, '[]'::jsonb) || '["Track sync to SoundCloud"]'::jsonb
  END,
  updated_at = now()
WHERE slug = 'pro';
