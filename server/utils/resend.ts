interface SendResendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  from?: string
  fromName?: string
}

export { upsertResendContact } from './resendContacts'
export type { ResendUserType, UpsertResendContactOptions } from './resendContacts'

export async function sendResendEmail({
  to,
  subject,
  html,
  from,
  fromName = 'Beatbox Studio',
}: SendResendEmailOptions): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured')
  }

  const fromEmail = from || process.env.RESEND_FROM_EMAIL?.trim() || 'notifications@beatbox.studio'
  const recipients = Array.isArray(to) ? to : [to]

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
      to: recipients,
      subject,
      html,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Resend API error (${response.status}): ${body}`)
  }
}
