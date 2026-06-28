import type { SupportSubmission } from '~/types/support'
import { sendResendEmail } from './resend'

const SUPPORT_NOTIFY_EMAIL = 'connectbbx@gmail.com'
const SUPPORT_FROM_EMAIL = 'notifications@beatbox.studio'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildSupportNotificationHtml(
  submission: SupportSubmission,
  notionUrl: string | null
): string {
  const screenshotNote = submission.screenshot
    ? `<p style="color:#666666;font-size:14px;margin:16px 0 0;">Screenshot attached in Notion.</p>`
    : ''

  const pageUrlBlock = submission.pageUrl
    ? `<p style="margin:0 0 8px;"><strong>Page:</strong> <a href="${escapeHtml(submission.pageUrl)}" style="color:#f59e0b;">${escapeHtml(submission.pageUrl)}</a></p>`
    : ''

  const notionLink = notionUrl
    ? `<p style="margin:24px 0 0;"><a href="${escapeHtml(notionUrl)}" style="background:#f59e0b;color:#000000;display:inline-block;font-size:14px;font-weight:600;padding:10px 18px;text-decoration:none;border-radius:4px;">Open in Notion</a></p>`
    : ''

  return `
    <div style="background:#ffffff;color:#000000;font-family:system-ui,-apple-system,sans-serif;max-width:560px;padding:0;">
      <h2 style="color:#000000;font-size:18px;font-weight:600;line-height:1.3;margin:0 0 16px;">New ${escapeHtml(submission.type)} — ${escapeHtml(submission.subject)}</h2>
      <p style="color:#333333;font-size:15px;line-height:1.5;margin:0 0 8px;"><strong>From:</strong> ${escapeHtml(submission.name)} &lt;${escapeHtml(submission.email)}&gt;</p>
      ${pageUrlBlock}
      <p style="color:#333333;font-size:15px;line-height:1.5;margin:16px 0 0;white-space:pre-wrap;">${escapeHtml(submission.message)}</p>
      ${screenshotNote}
      ${notionLink}
    </div>
  `
}

export async function notifySupportSubmission(
  submission: SupportSubmission,
  notionUrl: string | null
): Promise<void> {
  const to =
    process.env.SUPPORT_NOTIFY_EMAIL?.trim() ||
    process.env.NUXT_SUPPORT_NOTIFY_EMAIL?.trim() ||
    SUPPORT_NOTIFY_EMAIL

  await sendResendEmail({
    to,
    from: SUPPORT_FROM_EMAIL,
    subject: `[Beatbox ${submission.type}] ${submission.subject}`,
    html: buildSupportNotificationHtml(submission, notionUrl),
  })
}
