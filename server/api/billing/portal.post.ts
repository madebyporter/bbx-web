import { createError } from 'h3'
import { getServiceSupabase, requireAuthUser } from '../../utils/supabaseAuth'
import { getSiteUrl, getStripe, getStripePortalConfigurationId } from '../../utils/stripe'

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const supabase = getServiceSupabase()
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!sub?.stripe_customer_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No Stripe customer on file. Upgrade from the pricing page first.',
    })
  }

  const stripe = getStripe()
  const siteUrl = getSiteUrl()
  const configuration = getStripePortalConfigurationId()

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${siteUrl}/billing`,
    ...(configuration ? { configuration } : {}),
  })

  return { url: session.url }
})
