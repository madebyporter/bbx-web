import { createClient } from '@supabase/supabase-js'

const HOURS_MS = 60 * 60 * 1000
const REMINDER_1_HOURS = 24
const REMINDER_2_HOURS = 72
const SITE_URL = 'https://beatbox.studio'

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

function hoursSince(isoDate) {
  return (Date.now() - new Date(isoDate).getTime()) / HOURS_MS
}

async function sendResendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL || 'hello@beatbox.studio'
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured')
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: `Beatbox Studio <${from}>`,
      to: [to],
      subject,
      html
    })
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Resend API error (${response.status}): ${body}`)
  }
}

function reminderHtml({ confirmationUrl, reminderNumber }) {
  const headline =
    reminderNumber === 2
      ? 'Your Beatbox account is still waiting'
      : 'Finish setting up your Beatbox account'
  const intro =
    reminderNumber === 2
      ? 'You signed up a few days ago but have not confirmed your email yet. Confirm now to start using Beatbox Studio.'
      : 'You started signing up for Beatbox Studio but have not confirmed your email yet. It only takes a moment.'

  return `
    <div style="background:#ffffff;color:#000000;font-family:system-ui,-apple-system,sans-serif;max-width:480px;padding:0;">
      <h2 style="color:#000000;font-size:20px;font-weight:600;line-height:1.3;margin:0 0 16px;">${headline}</h2>
      <p style="color:#333333;font-size:16px;line-height:1.5;margin:0 0 24px;">${intro}</p>
      <p style="margin:0 0 28px;">
        <a href="${confirmationUrl}" style="background:#f59e0b;color:#000000;display:inline-block;font-size:16px;font-weight:600;padding:12px 24px;text-decoration:none;border-radius:4px;">
          Confirm email
        </a>
      </p>
      <p style="color:#666666;font-size:14px;line-height:1.5;margin:0;">
        If you did not sign up, you can ignore this email.
      </p>
    </div>
  `
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

async function generateConfirmationLink(supabase, email) {
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'signup',
    email,
    options: {
      redirectTo: `${SITE_URL}/auth/confirm`
    }
  })
  if (error) throw error
  return data?.properties?.action_link
}

async function markReminderSent(supabase, user, reminderKey) {
  const metadata = user.user_metadata || {}
  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...metadata,
      [reminderKey]: new Date().toISOString()
    }
  })
  if (error) throw error
}

function shouldSendReminder(user, reminderNumber, isCatchup) {
  if (user.email_confirmed_at) return false
  if (!user.email) return false

  const metadata = user.user_metadata || {}
  const reminder1At = metadata.onboarding_reminder_1_at
  const reminder2At = metadata.onboarding_reminder_2_at
  const ageHours = hoursSince(user.created_at)

  if (isCatchup) {
    if (reminderNumber === 1) return !reminder1At
    if (reminderNumber === 2) return !!reminder1At && !reminder2At
    return false
  }

  if (reminderNumber === 1) {
    return ageHours >= REMINDER_1_HOURS && ageHours < REMINDER_1_HOURS + 24 && !reminder1At
  }
  if (reminderNumber === 2) {
    return ageHours >= REMINDER_2_HOURS && ageHours < REMINDER_2_HOURS + 24 && !!reminder1At && !reminder2At
  }
  return false
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
      body: JSON.stringify({ error: 'Missing Supabase configuration' })
    }
  }

  const url = new URL(event.rawUrl || `https://localhost${event.path}`, 'https://localhost')
  const isCatchup = url.searchParams.get('mode') === 'catchup'

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const users = await listAllUsers(supabase)
  const results = {
    scanned: users.length,
    sent: 0,
    skipped: 0,
    errors: []
  }

  for (const user of users) {
    if (user.email_confirmed_at) {
      results.skipped += 1
      continue
    }

    let reminderNumber = null
    if (shouldSendReminder(user, 1, isCatchup)) {
      reminderNumber = 1
    } else if (shouldSendReminder(user, 2, isCatchup)) {
      reminderNumber = 2
    } else {
      results.skipped += 1
      continue
    }

    try {
      const confirmationUrl = await generateConfirmationLink(supabase, user.email)
      if (!confirmationUrl) {
        throw new Error('No confirmation link returned')
      }

      const subject =
        reminderNumber === 2
          ? 'Your Beatbox account is waiting for you'
          : 'Finish setting up your Beatbox account'

      await sendResendEmail({
        to: user.email,
        subject,
        html: reminderHtml({ confirmationUrl, reminderNumber })
      })

      await markReminderSent(
        supabase,
        user,
        reminderNumber === 1 ? 'onboarding_reminder_1_at' : 'onboarding_reminder_2_at'
      )
      results.sent += 1
    } catch (error) {
      results.errors.push({
        email: user.email,
        message: error instanceof Error ? error.message : String(error)
      })
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      ok: true,
      mode: isCatchup ? 'catchup' : 'scheduled',
      ...results
    })
  }
}

export const handler = async (event) => handlerImpl(event)
