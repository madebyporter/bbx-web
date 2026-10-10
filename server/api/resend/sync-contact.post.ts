import { createClient } from '@supabase/supabase-js'
import { createError, getHeader, readBody } from 'h3'
import { normalizeUserType, upsertResendContact } from '../../utils/resendContacts'
import { scheduleWelcomeEmail } from '../../utils/welcomeEmail'

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

  const body = await readBody<{ source?: string } | null>(event).catch(() => null)
  const source = body?.source === 'confirm' ? 'confirm' : null

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
    previousUserType,
  })

  const syncedUserType = normalizeUserType(profile?.user_type)
  const metadata = { ...(user.user_metadata || {}) }
  let metadataChanged = false

  if (previousUserType !== syncedUserType) {
    metadata.resend_synced_user_type = syncedUserType
    metadataChanged = true
  }

  let welcomeScheduled = false
  const alreadyScheduled =
    typeof metadata.welcome_email_scheduled_at === 'string' &&
    metadata.welcome_email_scheduled_at.length > 0

  if (source === 'confirm' && !alreadyScheduled) {
    const claimedAt = new Date().toISOString()
    metadata.welcome_email_scheduled_at = claimedAt
    metadataChanged = true

    await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: metadata,
    })
    metadataChanged = false

    try {
      await scheduleWelcomeEmail({ to: user.email, userId: user.id })
      welcomeScheduled = true
    } catch (error) {
      console.error('Failed to schedule welcome email:', error)
      delete metadata.welcome_email_scheduled_at
      await supabase.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...metadata,
          welcome_email_scheduled_at: null,
        },
      })
    }
  }

  if (metadataChanged) {
    await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: metadata,
    })
  }

  return { ok: true, synced: true, welcomeScheduled }
})
