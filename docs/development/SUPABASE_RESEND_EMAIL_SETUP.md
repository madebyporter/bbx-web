# Supabase auth email setup (Resend SMTP)

Configure production auth emails in the [Supabase dashboard](https://supabase.com/dashboard) for project **bbxweb**.

## 1. Custom SMTP (Resend)

**Authentication → Emails → SMTP Settings**

| Field | Value |
|-------|--------|
| Enable custom SMTP | On |
| Host | `smtp.resend.com` |
| Port | `465` (or `587`) |
| Username | `resend` |
| Password | Your Resend API key |
| Sender email | Verified address, e.g. `hello@beatbox.studio` |
| Sender name | `Beatbox Studio` |

## 2. Email templates

Copy HTML from the repo into the dashboard, or sync via CLI if you use linked config:

- **Confirm signup**: [`supabase/templates/confirm-signup.html`](../../supabase/templates/confirm-signup.html)
  - Subject: `Confirm your Beatbox account`
  - Keep `{{ .ConfirmationURL }}` in the template body.
- **Reset password**: [`supabase/templates/recovery.html`](../../supabase/templates/recovery.html)
  - Subject: `Reset your Beatbox password`

Local dev references the same templates in [`supabase/config.toml`](../../supabase/config.toml).

## 3. URL configuration

**Authentication → URL Configuration**

- Site URL: `https://beatbox.studio`
- Redirect URLs:
  - `https://beatbox.studio/auth/confirm`
  - `https://beatbox.studio/auth/reset-password`

## 4. Phase 2 reminder cron (Netlify)

Set these in Netlify environment variables:

- `SUPABASE_SERVICE_KEY` — service role key (never expose to client)
- `RESEND_API_KEY` — Resend API key for reminder emails
- `CRON_SECRET` — random secret; scheduled function checks `Authorization: Bearer <CRON_SECRET>`
- `RESEND_FROM_EMAIL` — e.g. `hello@beatbox.studio`
- `NUXT_PUBLIC_SUPABASE_URL` — project URL (already used by the app)

Optional manual catch-up for existing unconfirmed users:

```bash
curl -X POST "https://beatbox.studio/.netlify/functions/send-onboarding-reminders?mode=catchup" \
  -H "Authorization: Bearer $CRON_SECRET"
```
