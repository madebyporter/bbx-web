import { createClient } from '@supabase/supabase-js'
import { normalizeUserType, sleep, upsertResendContact } from './lib/resendContacts.js'

function isScheduledInvocation(event) {
  if (!event.body) return false
  try {
    const body = JSON.parse(event.body)
    return Boolean(body.next_run)
  } catch {
    return false
  }
}

function verifyCronSecret(event) {
  const expected = process.env.CRON_SECRET
  if (!expected) {
    console.error('CRON_SECRET is not configured')
    return false
  }
  const authHeader = event.headers?.authorization || event.headers?.Authorization || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  return token === expected
}

function verifyAccess(event) {
  if (isScheduledInvocation(event)) return true
  return verifyCronSecret(event)
}

async function listAllUsers(supabase) {
  const users = []
  let page = 1
  const perPage = 200

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    const batch = data?.users || []
    users.push(...batch)
    if (batch.length < perPage) break
    page += 1
  }

  return users
}

function firstNameFromProfile(profile, email) {
  const displayName = profile?.display_name?.trim()
  if (displayName) return displayName
  const localPart = email?.split('@')[0]?.trim()
  return localPart || 'there'
}

async function handlerImpl(event) {
  if (!verifyAccess(event)) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !serviceKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing Supabase configuration' }),
    }
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const users = await listAllUsers(supabase)
  const { data: profiles, error: profilesError } = await supabase
    .from('user_profiles')
    .select('id, username, display_name, user_type')

  if (profilesError) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Failed to load profiles: ${profilesError.message}` }),
    }
  }

  const profileById = new Map((profiles || []).map((profile) => [profile.id, profile]))
  const results = {
    scanned: users.length,
    synced: 0,
    skipped_unconfirmed: 0,
    errors: [],
  }

  for (const user of users) {
    if (!user.email_confirmed_at || !user.email) {
      results.skipped_unconfirmed += 1
      continue
    }

    const profile = profileById.get(user.id)

    try {
      await upsertResendContact({
        email: user.email,
        firstName: firstNameFromProfile(profile, user.email),
        userType: profile?.user_type,
      })
      results.synced += 1
    } catch (error) {
      results.errors.push({
        email: user.email,
        message: error instanceof Error ? error.message : String(error),
      })
    }

    await sleep(150)
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      ok: true,
      ...results,
    }),
  }
}

export const handler = async (event) => handlerImpl(event)
