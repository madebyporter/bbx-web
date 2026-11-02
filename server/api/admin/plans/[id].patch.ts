import { createError, getRouterParam, readBody } from 'h3'
import { requireAdminUser } from '../../../utils/billing'
import { ensureSingleDefaultPlan, validatePlanInput } from '../../../utils/planValidation'
import { getServiceSupabase } from '../../../utils/supabaseAuth'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id is required' })

  const body = await readBody(event)
  validatePlanInput(body, { partial: true })

  const supabase = getServiceSupabase()
  const patch: Record<string, unknown> = {}
  const fields = [
    'slug',
    'name',
    'description',
    'price_monthly_cents',
    'price_annual_cents',
    'currency',
    'track_limit',
    'storage_limit_bytes',
    'max_file_size_bytes',
    'features',
    'entitlements',
    'is_default',
    'is_active',
    'is_public',
    'sort_order',
    'badge',
  ] as const

  for (const key of fields) {
    if (body[key] !== undefined) {
      if (key === 'slug') patch.slug = String(body.slug).trim().toLowerCase()
      else patch[key] = body[key]
    }
  }

  if (patch.is_default === true) {
    const monthly =
      patch.price_monthly_cents !== undefined
        ? Number(patch.price_monthly_cents)
        : (
            await supabase.from('plans').select('price_monthly_cents').eq('id', id).maybeSingle()
          ).data?.price_monthly_cents
    if (Number(monthly) !== 0) {
      throw createError({ statusCode: 400, statusMessage: 'default plan must be free' })
    }
    await ensureSingleDefaultPlan(supabase, id, true)
  } else if (patch.is_default === false) {
    await ensureSingleDefaultPlan(supabase, id, false)
  }

  const { data, error } = await supabase.from('plans').update(patch).eq('id', id).select('*').single()
  if (error) {
    throw createError({ statusCode: 400, statusMessage: error.message })
  }

  return { plan: data }
})
