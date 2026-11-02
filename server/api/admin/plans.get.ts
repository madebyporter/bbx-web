import { requireAdminUser } from '../../utils/billing'
import { getServiceSupabase } from '../../utils/supabaseAuth'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)
  const supabase = getServiceSupabase()
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  return { plans: data || [] }
})
