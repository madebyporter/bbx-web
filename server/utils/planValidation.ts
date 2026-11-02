import { createError } from 'h3'

export interface PlanInput {
  slug?: string
  name?: string
  description?: string | null
  price_monthly_cents?: number
  price_annual_cents?: number | null
  currency?: string
  track_limit?: number | null
  storage_limit_bytes?: number | null
  max_file_size_bytes?: number | null
  features?: unknown
  entitlements?: Record<string, unknown>
  is_default?: boolean
  is_active?: boolean
  is_public?: boolean
  sort_order?: number
  badge?: string | null
}

export function validatePlanInput(input: PlanInput, { partial = false } = {}) {
  const errors: string[] = []

  if (!partial || input.slug !== undefined) {
    const slug = String(input.slug || '').trim()
    if (!slug) errors.push('slug is required')
    else if (!/^[a-z0-9_]+$/.test(slug)) errors.push('slug must be lowercase letters, numbers, underscores')
  }

  if (!partial || input.name !== undefined) {
    if (!String(input.name || '').trim()) errors.push('name is required')
  }

  if (input.price_monthly_cents !== undefined) {
    if (!Number.isInteger(input.price_monthly_cents) || input.price_monthly_cents < 0) {
      errors.push('price_monthly_cents must be a whole number of cents')
    }
  }

  if (input.price_annual_cents !== undefined && input.price_annual_cents !== null) {
    if (!Number.isInteger(input.price_annual_cents) || input.price_annual_cents < 0) {
      errors.push('price_annual_cents must be a whole number of cents or null')
    }
  }

  for (const key of ['track_limit', 'storage_limit_bytes', 'max_file_size_bytes'] as const) {
    const value = input[key]
    if (value !== undefined && value !== null) {
      if (!Number.isFinite(value) || Number(value) <= 0) {
        errors.push(`${key} must be positive or null`)
      }
    }
  }

  if (input.is_default === true) {
    const monthly = input.price_monthly_cents
    if (monthly !== undefined && monthly !== 0) {
      errors.push('default plan must be free (price_monthly_cents = 0)')
    }
  }

  if (errors.length) {
    throw createError({
      statusCode: 400,
      statusMessage: errors.join('; '),
    })
  }
}

export async function ensureSingleDefaultPlan(
  supabase: { from: (table: string) => any },
  planId: string,
  makingDefault: boolean,
) {
  if (!makingDefault) {
    const { data: current } = await supabase.from('plans').select('id, is_default').eq('id', planId).maybeSingle()
    if (current?.is_default) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Cannot unset the only default plan. Set another plan as default first.',
      })
    }
    return
  }

  await supabase.from('plans').update({ is_default: false }).neq('id', planId)
}
