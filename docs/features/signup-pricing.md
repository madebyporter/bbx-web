# Landing pricing and plan-first signup

Landing pricing cards, the redesigned auth modal (plan step first), and signup intent carry-through into Stripe Checkout. Plans always come from `GET /api/billing/plans` (or the temporary stub when billing is disabled). Studio is never shown.

## Setup

1. Set `NUXT_PUBLIC_BILLING_ENABLED=true` in `.env` when billing APIs are live.
2. When `false` or plans API 404s, `app/utils/billingStub.ts` supplies Free + Pro. Delete that file once payments is fully merged; acceptance is that flag `true` + delete stub needs no other code changes.
3. Stripe test mode + webhook as in [billing.md](./billing.md).

## Supabase redirect allowlist (Dashboard)

Query params on `emailRedirectTo` (`?plan=&interval=`) must match an allowed URL. Update **Authentication → URL Configuration → Redirect URLs** in the Supabase Dashboard (do not change dashboard without asking). Suggested entries:

- `https://beatbox.studio/auth/confirm`
- `https://beatbox.studio/auth/confirm**`
- Local: `http://localhost:3000/auth/confirm` and `http://localhost:3000/auth/confirm**`
- Local alt: `http://127.0.0.1:3000/auth/confirm` and `http://127.0.0.1:3000/auth/confirm**`

`supabase/config.toml` `additional_redirect_urls` mirrors these for local CLI.

## QA checklist

- [ ] Landing pricing shows Free and Pro only, with prices loaded from the API, and the monthly and annual toggle works
- [ ] Studio never appears; `?plan=studio` is ignored
- [ ] "Sign up free" goes to the signup form with Free preselected
- [ ] "Sign up for Pro" goes to the signup form with Pro and the interval preselected, and "Change" returns to the plan step
- [ ] Hero and Final CTA open at the plan step
- [ ] Free path: confirm email, then the app, with no Stripe
- [ ] Pro path: confirm email, Stripe Checkout, success page, plan is Pro (from the webhook)
- [ ] Cancel at Stripe: Free account plus the finish-upgrading banner; retry works; "Not now" hides it for 7 days
- [ ] Confirm link opened in another browser keeps the plan through sign in and into checkout
- [ ] Logged-in Free user's upgrade button goes straight to checkout; a paying user goes to the Portal
- [ ] Old entry points: Nav sign in, comments sign in, `?auth=signin`, `?auth=signup`, forgot password, resend confirmation
- [ ] Modal is 90% by 90% and 50/50 on desktop, full screen with no image on mobile
- [ ] Focus trap, Esc, backdrop click, focus return, scroll lock, and screen reader dialog announcement all work
- [ ] Image is optimized (webp under about 200 KB), credited in `CREDITS.md`, with correct alt text
- [ ] With billing disabled (stub), every path still works and paid buttons show "coming soon" instead of erroring
- [ ] Analytics events fire with the right properties and no personal data
- [ ] No em dashes in new UI copy

## Key files

| Path | Role |
|------|------|
| `app/composables/usePlans.ts` | Client-only plan fetch + stub fallback |
| `app/composables/useSignupIntent.ts` | Plan intent in state + localStorage |
| `app/composables/useCheckout.ts` | Hosted Stripe Checkout / Portal redirect |
| `app/components/PricingPlans.vue` | Shared cards (landing, pricing page, auth modal) |
| `app/components/AuthModal.vue` | Plan-first signup modal |
| `app/components/FinishUpgradeBanner.vue` | Post-cancel upgrade nudge |
| `app/utils/billingStub.ts` | Temporary Free/Pro stub |
