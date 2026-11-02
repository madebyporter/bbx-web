/**
 * TEMPORARY: delete when payments is merged.
 * Used only when GET /api/billing/plans returns 404 or billingEnabled is not 'true'.
 * Values copied from supabase/migrations/20261102120000_billing_plans.sql seed.
 */
import type { PublicPlan } from '~/types/billing'

export const STUB_BILLING_PLANS: PublicPlan[] = [
  {
    id: 'stub-free',
    slug: 'free',
    name: 'Free',
    description: 'Get started with Beatbox',
    price_monthly_cents: 0,
    price_annual_cents: null,
    currency: 'usd',
    track_limit: 5,
    storage_limit_bytes: 524288000,
    max_file_size_bytes: 52428800,
    features: ['5 tracks', 'Share links', 'Collections'],
    entitlements: { track_sync: false },
    is_default: true,
    badge: null,
    sort_order: 0,
  },
  {
    id: 'stub-pro',
    slug: 'pro',
    name: 'Pro',
    description: 'Unlimited tracks for working artists',
    price_monthly_cents: 900,
    price_annual_cents: 9000,
    currency: 'usd',
    track_limit: null,
    storage_limit_bytes: 107374182400,
    max_file_size_bytes: 52428800,
    features: ['Unlimited tracks', 'Everything in Free', 'Client and project management'],
    entitlements: { track_sync: false },
    is_default: false,
    badge: 'Most popular',
    sort_order: 1,
  },
]
