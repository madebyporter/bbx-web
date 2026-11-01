import { requireAdminUser } from '../../utils/billing'
import { getServiceSupabase } from '../../utils/supabaseAuth'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)
  const supabase = getServiceSupabase()
  const { data, error } = await supabase.from('billing_settings').select('*').eq('id', 1).maybeSingle()
  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
  return { settings: data }
})
