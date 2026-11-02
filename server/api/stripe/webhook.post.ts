import { createError, getHeader, readRawBody } from 'h3'
import type Stripe from 'stripe'
import { getServiceSupabase } from '../../utils/supabaseAuth'
import { getStripe, getStripeWebhookSecret } from '../../utils/stripe'
import {
  clearPastDueSinceForCustomer,
  markSubscriptionCanceled,
  setPastDueSinceForCustomer,
  upsertSubscriptionFromStripe,
} from '../../utils/stripeSubscriptionSync'

async function syncSubscriptionById(subscriptionId: string, extras: { userId?: string | null } = {}) {
  const stripe = getStripe()
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  await upsertSubscriptionFromStripe(subscription, extras)
}

export default defineEventHandler(async (event) => {
  const stripe = getStripe()
  const webhookSecret = getStripeWebhookSecret()
  const signature = getHeader(event, 'stripe-signature')
  if (!signature) {
    throw createError({ statusCode: 400, statusMessage: 'Missing stripe-signature' })
  }

  const rawBody = await readRawBody(event, false)
  if (!rawBody) {
    throw createError({ statusCode: 400, statusMessage: 'Missing body' })
  }

  let stripeEvent: Stripe.Event
  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err: any) {
    throw createError({
      statusCode: 400,
      statusMessage: `Webhook signature verification failed: ${err.message}`,
    })
  }

  const supabase = getServiceSupabase()
  const { data: inserted, error: insertError } = await supabase
    .from('stripe_events')
    .insert({ id: stripeEvent.id, type: stripeEvent.type })
    .select('id, processed_at')
    .maybeSingle()

  if (insertError) {
    if (insertError.code === '23505') {
      const { data: existing } = await supabase
        .from('stripe_events')
        .select('processed_at')
        .eq('id', stripeEvent.id)
        .maybeSingle()
      if (existing?.processed_at) {
        return { received: true, duplicate: true }
      }
    } else {
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to record event: ${insertError.message}`,
      })
    }
  } else if (inserted?.processed_at) {
    return { received: true, duplicate: true }
  }

  try {
    switch (stripeEvent.type) {
      case 'checkout.session.completed': {
        const session = stripeEvent.data.object as Stripe.Checkout.Session
        const userId = session.client_reference_id || session.metadata?.user_id || null
        const customerId =
          typeof session.customer === 'string' ? session.customer : session.customer?.id || null
        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id || null

        if (userId && customerId) {
          await supabase.from('subscriptions').upsert(
            {
              user_id: userId,
              stripe_customer_id: customerId,
              status: 'incomplete',
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' },
          )
        }

        if (subscriptionId) {
          await syncSubscriptionById(subscriptionId, { userId })
        }
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = stripeEvent.data.object as Stripe.Subscription
        await syncSubscriptionById(sub.id)
        break
      }
      case 'customer.subscription.deleted': {
        const sub = stripeEvent.data.object as Stripe.Subscription
        const fresh = await stripe.subscriptions.retrieve(sub.id).catch(() => sub)
        await markSubscriptionCanceled(fresh)
        break
      }
      case 'invoice.payment_failed': {
        const invoice = stripeEvent.data.object as Stripe.Invoice
        const customerId =
          typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id || null
        await setPastDueSinceForCustomer(customerId)
        break
      }
      case 'invoice.paid': {
        const invoice = stripeEvent.data.object as Stripe.Invoice
        const customerId =
          typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id || null
        await clearPastDueSinceForCustomer(customerId)
        const subscriptionId =
          typeof (invoice as any).subscription === 'string'
            ? (invoice as any).subscription
            : (invoice as any).subscription?.id || null
        if (subscriptionId) {
          await syncSubscriptionById(subscriptionId)
        }
        break
      }
      default:
        break
    }

    await supabase
      .from('stripe_events')
      .update({ processed_at: new Date().toISOString(), error: null })
      .eq('id', stripeEvent.id)

    return { received: true }
  } catch (err: any) {
    await supabase
      .from('stripe_events')
      .update({ error: err?.message || String(err) })
      .eq('id', stripeEvent.id)
    throw createError({
      statusCode: 500,
      statusMessage: err?.message || 'Webhook processing failed',
    })
  }
})
