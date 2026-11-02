-- Billing: plans, subscriptions, entitlements, upload enforcement
-- Additive and idempotent. Plan numbers live only in this seed.

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- plans
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  price_monthly_cents int NOT NULL DEFAULT 0,
  price_annual_cents int,
  currency text NOT NULL DEFAULT 'usd',
  stripe_product_id text,
  stripe_price_monthly_id text,
  stripe_price_annual_id text,
  track_limit int,
  storage_limit_bytes bigint,
  max_file_size_bytes bigint,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  entitlements jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  is_public boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  badge text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS plans_one_default_idx
  ON public.plans (is_default)
  WHERE is_default = true;

DROP TRIGGER IF EXISTS plans_set_updated_at ON public.plans;
CREATE TRIGGER plans_set_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS plans_select_active_public ON public.plans;
CREATE POLICY plans_select_active_public
  ON public.plans
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true AND is_public = true);

-- ---------------------------------------------------------------------------
-- subscriptions (one row per user)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subscriptions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.plans(id),
  status text NOT NULL,
  billing_interval text,
  stripe_customer_id text UNIQUE,
  stripe_subscription_id text UNIQUE,
  stripe_price_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  comp_plan_id uuid REFERENCES public.plans(id),
  comp_until timestamptz,
  comp_reason text,
  past_due_since timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subscriptions_billing_interval_check
    CHECK (billing_interval IS NULL OR billing_interval IN ('month', 'year'))
);

DROP TRIGGER IF EXISTS subscriptions_set_updated_at ON public.subscriptions;
CREATE TRIGGER subscriptions_set_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subscriptions_select_own ON public.subscriptions;
CREATE POLICY subscriptions_select_own
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- stripe_events (webhook idempotency)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stripe_events (
  id text PRIMARY KEY,
  type text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  error text
);

ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
-- No client policies: service role only

-- ---------------------------------------------------------------------------
-- billing_settings (single row)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.billing_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  grace_plan_slug text NOT NULL DEFAULT 'pro',
  grace_days int NOT NULL DEFAULT 60,
  grace_applies_to_users_created_before timestamptz,
  grace_enabled boolean NOT NULL DEFAULT true,
  past_due_grace_days int NOT NULL DEFAULT 7,
  enforcement_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS billing_settings_set_updated_at ON public.billing_settings;
CREATE TRIGGER billing_settings_set_updated_at
  BEFORE UPDATE ON public.billing_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.billing_settings ENABLE ROW LEVEL SECURITY;
-- No client policies: service role only

-- ---------------------------------------------------------------------------
-- get_effective_plan
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_effective_plan(p_user_id uuid)
RETURNS public.plans
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub public.subscriptions%ROWTYPE;
  v_settings public.billing_settings%ROWTYPE;
  v_plan public.plans%ROWTYPE;
BEGIN
  SELECT * INTO v_settings FROM public.billing_settings WHERE id = 1;
  SELECT * INTO v_sub FROM public.subscriptions WHERE user_id = p_user_id;

  -- 1. Active comp
  IF v_sub.user_id IS NOT NULL
     AND v_sub.comp_plan_id IS NOT NULL
     AND v_sub.comp_until IS NOT NULL
     AND v_sub.comp_until > now() THEN
    SELECT * INTO v_plan FROM public.plans WHERE id = v_sub.comp_plan_id;
    IF FOUND THEN
      RETURN v_plan;
    END IF;
  END IF;

  -- 2. Paid subscription (active / trialing / past_due within grace)
  IF v_sub.user_id IS NOT NULL AND v_sub.plan_id IS NOT NULL THEN
    IF v_sub.status IN ('active', 'trialing') THEN
      SELECT * INTO v_plan FROM public.plans WHERE id = v_sub.plan_id;
      IF FOUND THEN
        RETURN v_plan;
      END IF;
    ELSIF v_sub.status = 'past_due'
          AND v_sub.past_due_since IS NOT NULL
          AND v_settings.past_due_grace_days IS NOT NULL
          AND v_sub.past_due_since > (now() - make_interval(days => v_settings.past_due_grace_days)) THEN
      SELECT * INTO v_plan FROM public.plans WHERE id = v_sub.plan_id;
      IF FOUND THEN
        RETURN v_plan;
      END IF;
    END IF;
  END IF;

  -- 3. Default plan
  SELECT * INTO v_plan FROM public.plans WHERE is_default = true LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'no_default_plan';
  END IF;
  RETURN v_plan;
END;
$$;

-- ---------------------------------------------------------------------------
-- get_user_usage
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_usage(p_user_id uuid)
RETURNS TABLE (track_count bigint, storage_bytes bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*)::bigint AS track_count,
    COALESCE(SUM(COALESCE(file_size, 0)), 0)::bigint AS storage_bytes
  FROM public.sounds
  WHERE user_id = p_user_id;
$$;

-- ---------------------------------------------------------------------------
-- get_entitlements
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_entitlements(p_user_id uuid)
RETURNS TABLE (
  plan_id uuid,
  plan_slug text,
  plan_name text,
  track_limit int,
  storage_limit_bytes bigint,
  max_file_size_bytes bigint,
  track_count bigint,
  storage_bytes bigint,
  tracks_unlimited boolean,
  storage_unlimited boolean,
  over_track_limit boolean,
  over_storage_limit boolean,
  storage_percent numeric,
  entitlements jsonb,
  can_upload boolean,
  enforcement_enabled boolean,
  features jsonb,
  badge text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan public.plans%ROWTYPE;
  v_settings public.billing_settings%ROWTYPE;
  v_track_count bigint;
  v_storage_bytes bigint;
  v_tracks_unlimited boolean;
  v_storage_unlimited boolean;
  v_over_tracks boolean;
  v_over_storage boolean;
  v_storage_percent numeric;
  v_enforcement boolean;
  v_can_upload boolean;
  v_max_file bigint;
BEGIN
  v_plan := public.get_effective_plan(p_user_id);
  SELECT * INTO v_settings FROM public.billing_settings WHERE id = 1;
  v_enforcement := COALESCE(v_settings.enforcement_enabled, false);

  SELECT u.track_count, u.storage_bytes
  INTO v_track_count, v_storage_bytes
  FROM public.get_user_usage(p_user_id) u;

  v_tracks_unlimited := v_plan.track_limit IS NULL;
  v_storage_unlimited := v_plan.storage_limit_bytes IS NULL;
  v_max_file := COALESCE(v_plan.max_file_size_bytes, 52428800);

  v_over_tracks := CASE
    WHEN v_tracks_unlimited THEN false
    ELSE v_track_count >= v_plan.track_limit
  END;

  v_over_storage := CASE
    WHEN v_storage_unlimited THEN false
    ELSE v_storage_bytes >= v_plan.storage_limit_bytes
  END;

  v_storage_percent := CASE
    WHEN v_storage_unlimited OR v_plan.storage_limit_bytes = 0 THEN NULL
    ELSE ROUND((v_storage_bytes::numeric / v_plan.storage_limit_bytes::numeric) * 100, 2)
  END;

  v_can_upload := CASE
    WHEN NOT v_enforcement THEN true
    WHEN v_over_tracks OR v_over_storage THEN false
    ELSE true
  END;

  RETURN QUERY SELECT
    v_plan.id,
    v_plan.slug,
    v_plan.name,
    v_plan.track_limit,
    v_plan.storage_limit_bytes,
    v_max_file,
    v_track_count,
    v_storage_bytes,
    v_tracks_unlimited,
    v_storage_unlimited,
    v_over_tracks,
    v_over_storage,
    v_storage_percent,
    COALESCE(v_plan.entitlements, '{}'::jsonb),
    v_can_upload,
    v_enforcement,
    COALESCE(v_plan.features, '[]'::jsonb),
    v_plan.badge;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_effective_plan(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_usage(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_entitlements(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Enforcement trigger on sounds
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_sound_plan_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings public.billing_settings%ROWTYPE;
  v_plan public.plans%ROWTYPE;
  v_usage record;
  v_new_size bigint;
  v_old_size bigint;
  v_max_file bigint;
BEGIN
  SELECT * INTO v_settings FROM public.billing_settings WHERE id = 1;
  IF NOT COALESCE(v_settings.enforcement_enabled, false) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' AND NEW.file_size IS NULL THEN
    RAISE EXCEPTION 'file_size_required'
      USING ERRCODE = 'P0001';
  END IF;

  v_plan := public.get_effective_plan(NEW.user_id);
  SELECT * INTO v_usage FROM public.get_user_usage(NEW.user_id);
  v_max_file := COALESCE(v_plan.max_file_size_bytes, 52428800);
  v_new_size := COALESCE(NEW.file_size, 0);
  v_old_size := COALESCE(OLD.file_size, 0);

  IF TG_OP = 'INSERT' THEN
    IF v_plan.track_limit IS NOT NULL AND (v_usage.track_count + 1) > v_plan.track_limit THEN
      RAISE EXCEPTION 'plan_limit_reached:tracks'
        USING ERRCODE = 'P0001';
    END IF;

    IF v_plan.storage_limit_bytes IS NOT NULL
       AND (v_usage.storage_bytes + v_new_size) > v_plan.storage_limit_bytes THEN
      RAISE EXCEPTION 'plan_limit_reached:storage'
        USING ERRCODE = 'P0001';
    END IF;

    IF v_new_size > v_max_file THEN
      RAISE EXCEPTION 'plan_limit_reached:file_size'
        USING ERRCODE = 'P0001';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF v_new_size > v_old_size THEN
      IF v_plan.storage_limit_bytes IS NOT NULL
         AND (v_usage.storage_bytes - v_old_size + v_new_size) > v_plan.storage_limit_bytes THEN
        RAISE EXCEPTION 'plan_limit_reached:storage'
          USING ERRCODE = 'P0001';
      END IF;

      IF v_new_size > v_max_file THEN
        RAISE EXCEPTION 'plan_limit_reached:file_size'
          USING ERRCODE = 'P0001';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_sound_plan_limits_trigger ON public.sounds;
CREATE TRIGGER enforce_sound_plan_limits_trigger
  BEFORE INSERT OR UPDATE OF file_size ON public.sounds
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_sound_plan_limits();

-- ---------------------------------------------------------------------------
-- Seed plans (only place plan numbers appear in code)
-- ---------------------------------------------------------------------------
INSERT INTO public.plans (
  slug, name, description,
  price_monthly_cents, price_annual_cents, currency,
  track_limit, storage_limit_bytes, max_file_size_bytes,
  features, entitlements,
  is_default, is_active, is_public, sort_order, badge
) VALUES
(
  'free', 'Free', 'Get started with Beatbox',
  0, NULL, 'usd',
  5, 524288000, 52428800,
  '["5 tracks","Share links","Collections"]'::jsonb,
  '{"track_sync": false}'::jsonb,
  true, true, true, 0, NULL
),
(
  'pro', 'Pro', 'Unlimited tracks for working artists',
  900, 9000, 'usd',
  NULL, 107374182400, 52428800,
  '["Unlimited tracks","Everything in Free","Client and project management"]'::jsonb,
  '{"track_sync": false}'::jsonb,
  false, true, true, 1, 'Most popular'
),
(
  'studio', 'Studio', 'Reserved for upcoming track sync',
  1900, 19000, 'usd',
  NULL, 268435456000, 52428800,
  '["Everything in Pro","Track sync to third parties (coming soon)"]'::jsonb,
  '{"track_sync": true}'::jsonb,
  false, false, false, 2, NULL
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.billing_settings (
  id, grace_plan_slug, grace_days, grace_applies_to_users_created_before,
  grace_enabled, past_due_grace_days, enforcement_enabled
) VALUES (
  1, 'pro', 60, NULL, true, 7, false
)
ON CONFLICT (id) DO NOTHING;
