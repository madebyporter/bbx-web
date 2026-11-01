import { createError, getRouterParam, readBody } from 'h3'
import { requireAdminUser } from '../../../../utils/billing'
import { getServiceSupabase } from '../../../../utils/supabaseAuth'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)
  const userId = getRouterParam(event, 'id')
  if (!userId) throw createError({ statusCode: 400, statusMessage: 'user id is required' })

  const body = await readBody<{ planSlug?: string; until?: string; reason?: string }>(event)
  const planSlug = body.planSlug?.trim()
  const until = body.until?.trim()
  if (!planSlug || !until) {
    throw createError({ statusCode: 400, statusMessage: 'planSlug and until are required' })
  }

  const supabase = getServiceSupabase()
  const { data: plan } = await supabase.from('plans').select('id').eq('slug', planSlug).maybeSingle()
  if (!plan) throw createError({ statusCode: 404, statusMessage: 'Plan not found' })

  const { data: existing } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  const { data, error } = await supabase
    .from('subscriptions')
    .upsert(
      {
        user_id: userId,
        status: existing?.stripe_subscription_id ? existing.status : 'comped',
        plan_id: existing?.plan_id || plan.id,
        stripe_customer_id: existing?.stripe_customer_id || null,
        stripe_subscription_id: existing?.stripe_subscription_id || null,
        comp_plan_id: plan.id,
        comp_until: until,
        comp_reason: body.reason || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    .select('*')
    .single()

  if (error) {
    throw createError({ statusCode: 400, statusMessage: error.message })
  }

  return { subscription: data }
})
