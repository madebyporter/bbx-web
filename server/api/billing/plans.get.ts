import { getServiceSupabase } from '../../utils/supabaseAuth'

export default defineEventHandler(async () => {
  const supabase = getServiceSupabase()
  const { data, error } = await supabase
    .from('plans')
    .select(
      'id, slug, name, description, price_monthly_cents, price_annual_cents, currency, track_limit, storage_limit_bytes, max_file_size_bytes, features, entitlements, is_default, badge, sort_order',
    )
    .eq('is_active', true)
    .eq('is_public', true)
    .order('sort_order', { ascending: true })

  if (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to load plans: ${error.message}`,
    })
  }

  return { plans: data || [] }
})
