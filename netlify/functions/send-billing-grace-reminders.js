/**
 * Grace period reminder emails (14 days and 3 days before comp_until).
 * Built for rollout, but NOT scheduled in netlify.toml until copy is approved.
 *
 * Auth: scheduled body with next_run, or Authorization: Bearer CRON_SECRET
 */

import { createClient } from '@supabase/supabase-js'

const SITE_URL = process.env.SITE_URL || 'https://beatbox.studio'
const DAY_MS = 24 * 60 * 60 * 1000

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
  if (!expected) return false
  const authHeader = event.headers?.authorization || event.headers?.Authorization || ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  return token === expected
}

function verifyAccess(event) {
  if (isScheduledInvocation(event)) return true
  return verifyCronSecret(event)
}

async function sendResendEmail({ to, subject, html, idempotencyKey }) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL?.trim()
  if (!apiKey || !from) throw new Error('Resend is not configured')

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      from: `Beatbox Studio <${from}>`,
      to: [to],
      subject,
      html,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Resend API error (${response.status}): ${body}`)
  }
}

function reminderHtml({ daysLeft }) {
  return `
    <div style="background:#ffffff;color:#000000;font-family:system-ui,-apple-system,sans-serif;max-width:480px;padding:0;">
      <h2 style="color:#000000;font-size:20px;font-weight:600;line-height:1.3;margin:0 0 16px;">
        Your Pro trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}
      </h2>
      <p style="color:#333333;font-size:16px;line-height:1.5;margin:0 0 24px;">
        You have been on Pro as part of our launch grace period. After it ends you will move to Free.
        Your tracks stay playable and shareable. Upgrade if you want to keep unlimited uploads.
      </p>
      <p style="margin:0 0 28px;">
        <a href="${SITE_URL}/pricing" style="background:#f59e0b;color:#000000;display:inline-block;font-size:16px;font-weight:600;padding:12px 24px;text-decoration:none;border-radius:4px;">
          See plans
        </a>
      </p>
    </div>
  `
}

function daysUntil(iso) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / DAY_MS)
}

export async function handler(event) {
  if (!verifyAccess(event)) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) }
  }

  const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !serviceKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Supabase not configured' }) }
  }

  const supabase = createClient(supabaseUrl, serviceKey)
  const { data: rows, error } = await supabase
    .from('subscriptions')
    .select('user_id, comp_until, comp_reason')
    .eq('comp_reason', 'launch_grace')
    .not('comp_until', 'is', null)
    .gt('comp_until', new Date().toISOString())

  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
  }

  let sent = 0
  let skipped = 0
  const errors = []

  for (const row of rows || []) {
    const days = daysUntil(row.comp_until)
    if (days !== 14 && days !== 3) {
      skipped++
      continue
    }

    const metaKey = days === 14 ? 'grace_reminder_14_sent_at' : 'grace_reminder_3_sent_at'
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(row.user_id)
    if (userError || !userData?.user?.email) {
      skipped++
      continue
    }

    const meta = userData.user.user_metadata || {}
    if (meta[metaKey]) {
      skipped++
      continue
    }

    // Claim before send
    const { error: claimError } = await supabase.auth.admin.updateUserById(row.user_id, {
      user_metadata: {
        ...meta,
        [metaKey]: new Date().toISOString(),
      },
    })
    if (claimError) {
      errors.push(`${row.user_id}: claim failed`)
      continue
    }

    try {
      await sendResendEmail({
        to: userData.user.email,
        subject: `Your Pro trial ends in ${days} days`,
        html: reminderHtml({ daysLeft: days }),
        idempotencyKey: `grace-${days}-${row.user_id}-${row.comp_until}`,
      })
      sent++
    } catch (err) {
      errors.push(`${row.user_id}: ${err.message}`)
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ scanned: (rows || []).length, sent, skipped, errors }),
  }
}
