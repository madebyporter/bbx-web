import { getEntitlements } from '../../utils/billing'
import { getServiceSupabase, requireAuthUser } from '../../utils/supabaseAuth'

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const entitlements = await getEntitlements(user.id)
  const supabase = getServiceSupabase()

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select(
      'plan_id, status, billing_interval, current_period_end, cancel_at_period_end, comp_plan_id, comp_until, comp_reason, past_due_since, stripe_customer_id, stripe_subscription_id',
    )
    .eq('user_id', user.id)
    .maybeSingle()

  let compPlanSlug: string | null = null
  if (subscription?.comp_plan_id) {
    const { data: compPlan } = await supabase
      .from('plans')
      .select('slug')
      .eq('id', subscription.comp_plan_id)
      .maybeSingle()
    compPlanSlug = compPlan?.slug ?? null
  }

  return {
    entitlements,
    subscription: subscription
      ? {
          plan_id: subscription.plan_id,
          status: subscription.status,
          billing_interval: subscription.billing_interval,
          current_period_end: subscription.current_period_end,
          cancel_at_period_end: subscription.cancel_at_period_end,
          comp_plan_id: subscription.comp_plan_id,
          comp_plan_slug: compPlanSlug,
          comp_until: subscription.comp_until,
          comp_reason: subscription.comp_reason,
          past_due_since: subscription.past_due_since,
          has_stripe_customer: Boolean(subscription.stripe_customer_id),
          has_stripe_subscription: Boolean(subscription.stripe_subscription_id),
        }
      : null,
  }
})
