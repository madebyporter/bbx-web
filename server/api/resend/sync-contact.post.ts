import { createClient } from '@supabase/supabase-js'
import { createError, getHeader } from 'h3'
import { normalizeUserType, upsertResendContact } from '../../utils/resendContacts'

function readServerEnv(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim()
    if (value) return value
  }
  return ''
}

function firstNameFromProfile(
  profile: { display_name?: string | null } | null,
  email: string
): string {
  const displayName = profile?.display_name?.trim()
  if (displayName) return displayName
  const localPart = email.split('@')[0]?.trim()
  return localPart || 'there'
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const supabaseUrl = config.public.supabaseUrl
  const supabaseServiceKey = readServerEnv('SUPABASE_SERVICE_KEY', 'NUXT_SUPABASE_SERVICE_KEY')

  if (!supabaseUrl || !supabaseServiceKey) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Contact sync is temporarily unavailable.',
    })
  }

  const authHeader = getHeader(event, 'authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required.' })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const { data: authData, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authData.user) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid or expired session.' })
  }

  const user = authData.user
  if (!user.email_confirmed_at || !user.email) {
    return { ok: true, skipped: true, reason: 'email_not_confirmed' }
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('username, display_name, user_type')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load profile for contact sync.',
    })
  }

  const previousUserType =
    typeof user.user_metadata?.resend_synced_user_type === 'string'
      ? user.user_metadata.resend_synced_user_type
      : null

  await upsertResendContact({
    email: user.email,
    firstName: firstNameFromProfile(profile, user.email),
    userType: profile?.user_type,
    username: profile?.username,
    supabaseUserId: user.id,
    previousUserType,
  })

  const syncedUserType = normalizeUserType(profile?.user_type)
  if (previousUserType !== syncedUserType) {
    const metadata = user.user_metadata || {}
    await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...metadata,
        resend_synced_user_type: syncedUserType,
      },
    })
  }

  return { ok: true, synced: true }
})
