import { createError, getRouterParam } from 'h3'
import { requireAdminUser } from '../../../../utils/billing'
import { getStripe } from '../../../../utils/stripe'
import { getServiceSupabase } from '../../../../utils/supabaseAuth'

async function syncPrice(opts: {
  stripe: ReturnType<typeof getStripe>
  plan: Record<string, any>
  interval: 'month' | 'year'
  amountCents: number | null
  existingPriceId: string | null
}): Promise<string | null> {
  const { stripe, plan, interval, amountCents, existingPriceId } = opts
  if (amountCents == null || amountCents < 0) return existingPriceId

  const lookupKey = `${plan.slug}_${interval === 'month' ? 'monthly' : 'annual'}`

  if (existingPriceId) {
    try {
      const existing = await stripe.prices.retrieve(existingPriceId)
      const sameAmount = existing.unit_amount === amountCents
      const sameInterval = existing.recurring?.interval === interval
      if (sameAmount && sameInterval && existing.active) {
        return existingPriceId
      }
      await stripe.prices.update(existingPriceId, { active: false })
    } catch {
      // create a new price below
    }
  }

  const price = await stripe.prices.create({
    product: plan.stripe_product_id,
    currency: plan.currency || 'usd',
    unit_amount: amountCents,
    recurring: { interval },
    lookup_key: lookupKey,
    transfer_lookup_key: true,
    metadata: { plan_slug: plan.slug },
  })

  return price.id
}

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const supabase = getServiceSupabase()
  const { data: plan, error } = await supabase.from('plans').select('*').eq('id', id).maybeSingle()
  if (error || !plan) {
    throw createError({ statusCode: 404, statusMessage: 'Plan not found' })
  }
  if (plan.is_default) {
    return { skipped: true, reason: 'Default free plan is not synced to Stripe' }
  }

  const stripe = getStripe()
  let productId = plan.stripe_product_id as string | null

  if (productId) {
    await stripe.products.update(productId, {
      name: plan.name,
      description: plan.description || undefined,
      metadata: { plan_slug: plan.slug },
      active: plan.is_active,
    })
  } else {
    const product = await stripe.products.create({
      name: plan.name,
      description: plan.description || undefined,
      metadata: { plan_slug: plan.slug },
      active: plan.is_active,
    })
    productId = product.id
  }

  const workingPlan = { ...plan, stripe_product_id: productId }
  const monthlyId = await syncPrice({
    stripe,
    plan: workingPlan,
    interval: 'month',
    amountCents: plan.price_monthly_cents,
    existingPriceId: plan.stripe_price_monthly_id,
  })
  const annualId = await syncPrice({
    stripe,
    plan: workingPlan,
    interval: 'year',
    amountCents: plan.price_annual_cents,
    existingPriceId: plan.stripe_price_annual_id,
  })

  const { data: updated, error: updateError } = await supabase
    .from('plans')
    .update({
      stripe_product_id: productId,
      stripe_price_monthly_id: monthlyId,
      stripe_price_annual_id: annualId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single()

  if (updateError) {
    throw createError({ statusCode: 500, statusMessage: updateError.message })
  }

  return {
    plan: updated,
    note: 'Existing subscribers stay on their previous Stripe price until they change plans.',
  }
})
