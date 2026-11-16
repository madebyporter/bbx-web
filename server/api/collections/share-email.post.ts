import { createError, readBody } from 'h3'
import { getServiceSupabase, requireAuthUser } from '../../utils/supabaseAuth'
import { getSiteUrl } from '../../utils/stripe'
import { sendResendEmail } from '../../utils/resend'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_RECIPIENTS = 10

interface ShareEmailBody {
  collectionId?: number | string
  emails?: string[] | string
}

function normalizeEmails(input: ShareEmailBody['emails']): string[] {
  const raw = Array.isArray(input)
    ? input
    : typeof input === 'string'
      ? input.split(/[,;\s]+/)
      : []

  const unique = [...new Set(
    raw
      .map((email) => String(email || '').trim().toLowerCase())
      .filter(Boolean),
  )]

  return unique.filter((email) => EMAIL_RE.test(email))
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const body = await readBody<ShareEmailBody>(event)

  const collectionId = Number(body?.collectionId)
  if (!Number.isFinite(collectionId) || collectionId <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'collectionId is required',
    })
  }

  const emails = normalizeEmails(body?.emails)
  if (emails.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'At least one valid email is required',
    })
  }
  if (emails.length > MAX_RECIPIENTS) {
    throw createError({
      statusCode: 400,
      statusMessage: `You can send to at most ${MAX_RECIPIENTS} emails at once`,
    })
  }

  const supabase = getServiceSupabase()
  const { data: collection, error: collectionError } = await supabase
    .from('collections')
    .select('id, name, user_id')
    .eq('id', collectionId)
    .maybeSingle()

  if (collectionError) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load collection',
    })
  }

  if (!collection) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Collection not found',
    })
  }

  if (collection.user_id !== user.id) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Only the collection owner can share via email',
    })
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('display_name, username')
    .eq('id', user.id)
    .maybeSingle()

  const sharerName =
    (typeof profile?.display_name === 'string' && profile.display_name.trim())
    || (typeof profile?.username === 'string' && profile.username.trim())
    || 'Someone'

  const collectionName =
    (typeof collection.name === 'string' && collection.name.trim())
    || 'a collection'

  const siteUrl = getSiteUrl(event)
  const inviteLink = `${siteUrl}/collections/invite/${collectionId}`

  const subject = `${sharerName} shared “${collectionName}” on Beatbox`
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.5; color: #111;">
      <p><strong>${escapeHtml(sharerName)}</strong> shared the collection <strong>${escapeHtml(collectionName)}</strong> with you on Beatbox.</p>
      <p><a href="${escapeHtml(inviteLink)}" style="color: #d97706;">Open the invite link</a> to join and listen.</p>
      <p style="color: #666; font-size: 12px;">If the button doesn’t work, copy this URL:<br>${escapeHtml(inviteLink)}</p>
    </div>
  `

  try {
    await sendResendEmail({
      to: emails,
      subject,
      html,
    })
  } catch (error: any) {
    console.error('share-email Resend error:', error)
    throw createError({
      statusCode: 502,
      statusMessage: error?.message || 'Failed to send share email',
    })
  }

  return {
    ok: true,
    sent: emails.length,
  }
})
