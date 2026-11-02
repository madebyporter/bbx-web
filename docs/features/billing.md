# Billing, plans, and upload caps

Plans live in the `plans` table. App and server code never hardcode plan prices or limits (seed migration only).

## Setup (local)

1. Apply migration `supabase/migrations/20261102120000_billing_plans.sql` to local or **dev** Supabase only (ask before applying).
2. Copy Stripe test keys into `.env` from `.env.example`:
   - `STRIPE_SECRET_KEY=sk_test_...`
   - `STRIPE_WEBHOOK_SECRET=whsec_...` (from Stripe CLI)
   - optional `STRIPE_PORTAL_CONFIGURATION_ID` after admin portal sync
3. Stripe CLI:
   ```bash
   stripe login
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
4. Keep `enforcement_enabled = false` until meters, backfill, and grace are ready. Flip it in Admin → Plans and billing.
5. Backfill file sizes (dry run first):
   ```bash
   npm run backfill:file-sizes
   npm run backfill:file-sizes -- --write
   ```
6. After setting grace cutoff in admin:
   ```bash
   npm run billing:grant-grace
   npm run billing:grant-grace -- --write
   ```
7. Grace reminder function exists at `netlify/functions/send-billing-grace-reminders.js` but is **not scheduled** until copy is approved.

## Manual QA checklist

- [ ] Free signup can upload 5 tracks, the 6th is blocked before upload
- [ ] File over the plan max size is blocked before upload
- [ ] Presigned URL rejects a body bigger than the declared size
- [ ] Upgrade monthly and annual with test cards, limits update within seconds
- [ ] Pro shows "Unlimited tracks"; a Pro user is never blocked by track count
- [ ] Pro user near the backstop sees fair use wording, not an upgrade push
- [ ] Studio is hidden from `/pricing`, Checkout, and the Portal, but editable in the admin
- [ ] `track_sync` entitlement can be flipped per plan in the admin with no deploy
- [ ] Monthly to annual prorates now; annual to monthly waits until period end
- [ ] Cancel keeps paid limits until period end, then Free, files kept
- [ ] Failed payment keeps limits during the grace window, then Free
- [ ] Duplicate webhook delivery is a no-op
- [ ] Admin adds a third paid plan and it is buyable without a deploy
- [ ] Admin price change grandfathers current subscribers
- [ ] Enforcement switch off means meter only, no blocking
- [ ] Launch grace gives existing users Pro until the configured date
- [ ] Legacy `supabase` storage tracks are counted in usage
- [ ] Non-admins get 403 on admin routes

## Key routes

| Route | Role |
|-------|------|
| `GET /api/billing/plans` | Public active public plans |
| `GET /api/billing/me` | Entitlements + subscription |
| `POST /api/billing/checkout` | Stripe Checkout (or Portal if already paying) |
| `POST /api/billing/portal` | Customer Portal |
| `POST /api/stripe/webhook` | Stripe sync |
| `GET/POST/PATCH /api/admin/plans*` | Admin plan management |
| `POST /api/admin/stripe/portal-config` | Portal configuration |

## Counting rules

- Tracks = rows in `sounds` for the user (including versions).
- Storage = sum of `file_size` on those rows (audio only).
- `NULL` plan limits mean unlimited (never use a sentinel like 999999).
