-- Admins get the public unlimited-tracks plan with no subscription.
-- Comp and active paid plans still win. Falls through to Free only if no unlimited plan exists.

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

  -- 3. Admin role: public plan with unlimited tracks, no payment
  IF EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = p_user_id
      AND COALESCE(u.raw_app_meta_data->'roles', '[]'::jsonb) ? 'admin'
  ) THEN
    SELECT * INTO v_plan
    FROM public.plans
    WHERE is_active = true
      AND is_public = true
      AND track_limit IS NULL
    ORDER BY sort_order ASC
    LIMIT 1;

    IF FOUND THEN
      RETURN v_plan;
    END IF;
  END IF;

  -- 4. Default plan
  SELECT * INTO v_plan FROM public.plans WHERE is_default = true LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'no_default_plan';
  END IF;
  RETURN v_plan;
END;
$$;
