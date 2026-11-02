import type Stripe from 'stripe'
import { getServiceSupabase } from './supabaseAuth'
import { getStripe, periodEndToIso } from './stripe'

export async function findPlanByStripePriceId(priceId: string | null | undefined) {
  if (!priceId) return null
  const supabase = getServiceSupabase()

  const { data: byMonthly } = await supabase
    .from('plans')
    .select('*')
    .eq('stripe_price_monthly_id', priceId)
    .maybeSingle()
  if (byMonthly) return { plan: byMonthly, interval: 'month' as const }

  const { data: byAnnual } = await supabase
    .from('plans')
    .select('*')
    .eq('stripe_price_annual_id', priceId)
    .maybeSingle()
  if (byAnnual) return { plan: byAnnual, interval: 'year' as const }

  const stripe = getStripe()
  try {
    const price = await stripe.prices.retrieve(priceId)
    const slug = price.metadata?.plan_slug
    if (slug) {
      const { data: bySlug } = await supabase.from('plans').select('*').eq('slug', slug).maybeSingle()
      if (bySlug) {
        const interval = price.recurring?.interval === 'year' ? 'year' : 'month'
        return { plan: bySlug, interval: interval as 'month' | 'year' }
      }
    }
  } catch (err) {
    console.error('Failed to resolve Stripe price metadata', priceId, err)
  }

  console.error('Unknown Stripe price id, leaving plan unchanged:', priceId)
  return null
}

export async function upsertSubscriptionFromStripe(
  subscription: Stripe.Subscription,
  extras: {
    userId?: string | null
    stripeCustomerId?: string | null
  } = {},
) {
  const supabase = getServiceSupabase()
  const priceId = subscription.items?.data?.[0]?.price?.id || null
  const matched = await findPlanByStripePriceId(priceId)

  let userId = extras.userId || subscription.metadata?.user_id || null
  const customerId =
    extras.stripeCustomerId ||
    (typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id) ||
    null

  if (!userId && customerId) {
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle()
    userId = existing?.user_id || null
  }

  if (!userId) {
    console.error('Cannot sync subscription without user_id', subscription.id)
    return
  }

  const { data: existing } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  const status = subscription.status
  let pastDueSince = existing?.past_due_since ?? null
  if (status === 'past_due') {
    if (!pastDueSince) pastDueSince = new Date().toISOString()
  } else if (status === 'active' || status === 'trialing') {
    pastDueSince = null
  }

  const patch: Record<string, unknown> = {
    user_id: userId,
    status,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId,
    billing_interval: matched?.interval ?? existing?.billing_interval ?? null,
    current_period_end: periodEndToIso(subscription),
    cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    past_due_since: pastDueSince,
    updated_at: new Date().toISOString(),
  }

  if (matched?.plan?.id) {
    patch.plan_id = matched.plan.id
  } else if (existing?.plan_id) {
    patch.plan_id = existing.plan_id
  }

  const { error } = await supabase.from('subscriptions').upsert(patch, { onConflict: 'user_id' })
  if (error) {
    throw new Error(`Failed to upsert subscription: ${error.message}`)
  }
}

export async function markSubscriptionCanceled(subscription: Stripe.Subscription) {
  const supabase = getServiceSupabase()
  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id

  let query = supabase.from('subscriptions').select('user_id')
  if (subscription.id) {
    query = query.eq('stripe_subscription_id', subscription.id)
  } else if (customerId) {
    query = query.eq('stripe_customer_id', customerId)
  } else {
    return
  }

  const { data: row } = await query.maybeSingle()
  if (!row?.user_id) return

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      stripe_subscription_id: null,
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', row.user_id)

  if (error) {
    throw new Error(`Failed to mark subscription canceled: ${error.message}`)
  }
}

export async function setPastDueSinceForCustomer(customerId: string | null) {
  if (!customerId) return
  const supabase = getServiceSupabase()
  const { data: row } = await supabase
    .from('subscriptions')
    .select('user_id, past_due_since')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()
  if (!row?.user_id || row.past_due_since) return

  await supabase
    .from('subscriptions')
    .update({
      past_due_since: new Date().toISOString(),
      status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', row.user_id)
}

export async function clearPastDueSinceForCustomer(customerId: string | null) {
  if (!customerId) return
  const supabase = getServiceSupabase()
  await supabase
    .from('subscriptions')
    .update({
      past_due_since: null,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', customerId)
}
