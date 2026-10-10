const WELCOME_FROM = 'Porter <porter@beatbox.studio>'
const WELCOME_SUBJECT = 'you found Beatbox'
const HOURS_MS = 60 * 60 * 1000

const WELCOME_TEXT = `Hey, that signup button is pretty hidden, but you found it anyway. I'm Porter. I built Beatbox and I make beats too.

What brought you here? Just hit reply, I read every one.

Porter`

function welcomeHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
</head>
<body style="margin:0;padding:0;background-color:#ffffff;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#ffffff;">
    <tr>
      <td align="left" style="padding-top:0;padding-right:0;padding-bottom:0;padding-left:0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:480px;">
          <tr>
            <td style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#333333;padding-top:0;padding-right:0;padding-bottom:16px;padding-left:0;">
              Hey, that signup button is pretty hidden, but you found it anyway. I'm Porter. I built Beatbox and I make beats too.
            </td>
          </tr>
          <tr>
            <td style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#333333;padding-top:0;padding-right:0;padding-bottom:16px;padding-left:0;">
              What brought you here? Just hit reply, I read every one.
            </td>
          </tr>
          <tr>
            <td style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#333333;padding-top:0;padding-right:0;padding-bottom:0;padding-left:0;">
              Porter
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function scheduleWelcomeEmail({
  to,
  userId,
}: {
  to: string
  userId: string
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured')
  }

  const scheduledAt = new Date(Date.now() + 24 * HOURS_MS).toISOString()

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `bbx-welcome/${userId}`,
    },
    body: JSON.stringify({
      from: WELCOME_FROM,
      reply_to: WELCOME_FROM,
      to: [to],
      subject: WELCOME_SUBJECT,
      html: welcomeHtml(),
      text: WELCOME_TEXT,
      scheduled_at: scheduledAt,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Resend welcome schedule error (${response.status}): ${body}`)
  }
}
