import { createError, getQuery } from 'h3'
import { requireAdminUser } from '../../../utils/billing'
import { getServiceSupabase } from '../../../utils/supabaseAuth'

export default defineEventHandler(async (event) => {
  await requireAdminUser(event)
  const q = String(getQuery(event).q || '').trim()
  if (!q) {
    throw createError({ statusCode: 400, statusMessage: 'q is required' })
  }

  const supabase = getServiceSupabase()
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, username, display_name')
    .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
    .limit(10)

  // Also try auth email via admin API when it looks like an email
  let emailMatches: Array<{ id: string; email?: string }> = []
  if (q.includes('@')) {
    const { data } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 })
    emailMatches = (data?.users || [])
      .filter((u) => u.email?.toLowerCase().includes(q.toLowerCase()))
      .slice(0, 10)
      .map((u) => ({ id: u.id, email: u.email }))
  }

  return {
    profiles: profiles || [],
    users: emailMatches,
  }
})
