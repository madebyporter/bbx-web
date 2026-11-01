import { createError, getRouterParam } from 'h3'
import { requireAdminUser } from '../../../../utils/billing'
import { getServiceSupabase } from '../../../../utils/supabaseAuth'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)
  const userId = getRouterParam(event, 'id')
  if (!userId) throw createError({ statusCode: 400, statusMessage: 'user id is required' })

  const supabase = getServiceSupabase()
  const { data, error } = await supabase
    .from('subscriptions')
    .update({
      comp_plan_id: null,
      comp_until: null,
      comp_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select('*')
    .maybeSingle()

  if (error) {
    throw createError({ statusCode: 400, statusMessage: error.message })
  }

  return { subscription: data }
})
