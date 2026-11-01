import { createError, readBody } from 'h3'
import { getServiceSupabase, requireAuthUser } from '../../utils/supabaseAuth'
import { getSiteUrl, getStripe } from '../../utils/stripe'

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const body = await readBody<{ planSlug?: string; interval?: 'month' | 'year' }>(event)
  const planSlug = body.planSlug?.trim()
  const interval = body.interval === 'year' ? 'year' : 'month'

  if (!planSlug) {
    throw createError({ statusCode: 400, statusMessage: 'planSlug is required' })
  }

  const supabase = getServiceSupabase()
  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select('*')
    .eq('slug', planSlug)
    .maybeSingle()

  if (planError || !plan) {
    throw createError({ statusCode: 404, statusMessage: 'Plan not found' })
  }
  if (!plan.is_active) {
    throw createError({ statusCode: 400, statusMessage: 'Plan is not active' })
  }
  if (!plan.is_public) {
    throw createError({ statusCode: 400, statusMessage: 'Plan is not available' })
  }
  if (plan.is_default) {
    throw createError({ statusCode: 400, statusMessage: 'Cannot checkout the free plan' })
  }

  const priceId =
    interval === 'year' ? plan.stripe_price_annual_id : plan.stripe_price_monthly_id
  if (!priceId) {
    throw createError({
      statusCode: 400,
      statusMessage: `Plan is missing a Stripe ${interval}ly price`,
    })
  }

  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  const stripe = getStripe()
  const siteUrl = getSiteUrl()

  const paidActive =
    existingSub &&
    existingSub.stripe_subscription_id &&
    ['active', 'trialing', 'past_due'].includes(existingSub.status)

  if (paidActive && existingSub.stripe_customer_id) {
    const portal = await stripe.billingPortal.sessions.create({
      customer: existingSub.stripe_customer_id,
      return_url: `${siteUrl}/billing`,
    })
    return { url: portal.url }
  }

  let customerId = existingSub?.stripe_customer_id || null
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email || undefined,
      metadata: { user_id: user.id },
    })
    customerId = customer.id
    await supabase.from('subscriptions').upsert(
      {
        user_id: user.id,
        status: existingSub?.status || 'incomplete',
        stripe_customer_id: customerId,
        plan_id: existingSub?.plan_id || plan.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
  }

  const minuteKey = new Date().toISOString().slice(0, 16)
  const idempotencyKey = `checkout:${user.id}:${plan.slug}:${interval}:${minuteKey}`

  let session
  try {
    session = await stripe.checkout.sessions.create(
      {
        mode: 'subscription',
        customer: customerId,
        client_reference_id: user.id,
        allow_promotion_codes: true,
        line_items: [{ price: priceId, quantity: 1 }],
        // This Stripe account has Managed Payments on by default, which requires
        // product tax codes. Standard Checkout subscriptions do not need that.
        managed_payments: { enabled: false },
        subscription_data: {
          metadata: {
            user_id: user.id,
            plan_slug: plan.slug,
          },
        },
        success_url: `${siteUrl}/billing?status=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl}/pricing?status=canceled`,
        metadata: {
          user_id: user.id,
          plan_slug: plan.slug,
        },
      } as Parameters<typeof stripe.checkout.sessions.create>[0],
      { idempotencyKey },
    )
  } catch (err: any) {
    const message = err?.message || 'Stripe checkout failed'
    throw createError({
      statusCode: err?.statusCode || 400,
      statusMessage: message,
    })
  }

  if (!session.url) {
    throw createError({ statusCode: 500, statusMessage: 'Checkout session missing URL' })
  }

  return { url: session.url }
})
