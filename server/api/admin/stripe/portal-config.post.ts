import { requireAdminUser } from '../../../utils/billing'
import { getStripe } from '../../../utils/stripe'
import { getServiceSupabase } from '../../../utils/supabaseAuth'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)
  const supabase = getServiceSupabase()
  const { data: plans, error } = await supabase
    .from('plans')
    .select('*')
    .eq('is_active', true)
    .eq('is_public', true)
    .eq('is_default', false)
    .order('sort_order', { ascending: true })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  const products = (plans || [])
    .filter((p) => p.stripe_product_id)
    .map((p) => {
      const prices: string[] = []
      if (p.stripe_price_monthly_id) prices.push(p.stripe_price_monthly_id)
      if (p.stripe_price_annual_id) prices.push(p.stripe_price_annual_id)
      return {
        product: p.stripe_product_id as string,
        prices,
      }
    })
    .filter((p) => p.prices.length > 0)

  const stripe = getStripe()
  const config = useRuntimeConfig()
  const existingId =
    (config.stripePortalConfigurationId as string | undefined)?.trim() ||
    process.env.STRIPE_PORTAL_CONFIGURATION_ID?.trim() ||
    ''

  const payload = {
    business_profile: {
      headline: 'Manage your Beatbox subscription',
    },
    features: {
      customer_update: {
        enabled: true,
        allowed_updates: ['email', 'address', 'tax_id'] as Array<'email' | 'address' | 'tax_id'>,
      },
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: {
        enabled: true,
        mode: 'at_period_end' as const,
        proration_behavior: 'none' as const,
      },
      subscription_update: {
        enabled: products.length > 0,
        default_allowed_updates: ['price'] as Array<'price'>,
        proration_behavior: 'always_invoice' as const,
        products,
      },
    },
  }

  const configuration = existingId
    ? await stripe.billingPortal.configurations.update(existingId, payload)
    : await stripe.billingPortal.configurations.create(payload)

  return {
    configurationId: configuration.id,
    message:
      'Set STRIPE_PORTAL_CONFIGURATION_ID to this value in your env (and Netlify) if it is new.',
  }
})
