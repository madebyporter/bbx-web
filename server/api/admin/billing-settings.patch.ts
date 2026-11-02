import { readBody } from 'h3'
import { requireAdminUser } from '../../utils/billing'
import { getServiceSupabase } from '../../utils/supabaseAuth'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)
  const body = await readBody(event)
  const supabase = getServiceSupabase()

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of [
    'grace_plan_slug',
    'grace_days',
    'grace_applies_to_users_created_before',
    'grace_enabled',
    'past_due_grace_days',
    'enforcement_enabled',
  ]) {
    if (body[key] !== undefined) patch[key] = body[key]
  }

  const { data, error } = await supabase
    .from('billing_settings')
    .update(patch)
    .eq('id', 1)
    .select('*')
    .single()

  if (error) {
    throw createError({ statusCode: 400, statusMessage: error.message })
  }

  return { settings: data }
})
