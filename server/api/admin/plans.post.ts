import { readBody } from 'h3'
import { requireAdminUser } from '../../utils/billing'
import { ensureSingleDefaultPlan, validatePlanInput } from '../../utils/planValidation'
import { getServiceSupabase } from '../../utils/supabaseAuth'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)
  const body = await readBody(event)
  validatePlanInput(body)

  const supabase = getServiceSupabase()
  const payload = {
    slug: String(body.slug).trim().toLowerCase(),
    name: String(body.name).trim(),
    description: body.description ?? null,
    price_monthly_cents: Number(body.price_monthly_cents ?? 0),
    price_annual_cents: body.price_annual_cents == null ? null : Number(body.price_annual_cents),
    currency: body.currency || 'usd',
    track_limit: body.track_limit == null ? null : Number(body.track_limit),
    storage_limit_bytes: body.storage_limit_bytes == null ? null : Number(body.storage_limit_bytes),
    max_file_size_bytes: body.max_file_size_bytes == null ? null : Number(body.max_file_size_bytes),
    features: Array.isArray(body.features) ? body.features : [],
    entitlements: body.entitlements && typeof body.entitlements === 'object' ? body.entitlements : {},
    is_default: Boolean(body.is_default),
    is_active: body.is_active !== false,
    is_public: body.is_public !== false,
    sort_order: Number(body.sort_order ?? 0),
    badge: body.badge ?? null,
  }

  if (payload.is_default && payload.price_monthly_cents !== 0) {
    throw createError({ statusCode: 400, statusMessage: 'default plan must be free' })
  }

  const { data, error } = await supabase.from('plans').insert(payload).select('*').single()
  if (error) {
    throw createError({ statusCode: 400, statusMessage: error.message })
  }

  if (payload.is_default) {
    await ensureSingleDefaultPlan(supabase, data.id, true)
  }

  return { plan: data }
})
