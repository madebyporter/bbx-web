import Stripe from 'stripe'
import { createError, getRequestHeader, type H3Event } from 'h3'

/** Pinned to the version shipped with the installed stripe SDK. */
export const STRIPE_API_VERSION = '2026-10-28.endive' as const

let stripeClient: Stripe | null = null

export function getStripe(): Stripe {
  if (stripeClient) return stripeClient

  const config = useRuntimeConfig()
  const key =
    (config.stripeSecretKey as string | undefined)?.trim() ||
    process.env.STRIPE_SECRET_KEY?.trim() ||
    ''

  if (!key) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Stripe is not configured',
    })
  }

  stripeClient = new Stripe(key, {
    apiVersion: STRIPE_API_VERSION,
    typescript: true,
  })
  return stripeClient
}

export function getStripeWebhookSecret(): string {
  const config = useRuntimeConfig()
  const secret =
    (config.stripeWebhookSecret as string | undefined)?.trim() ||
    process.env.STRIPE_WEBHOOK_SECRET?.trim() ||
    ''
  if (!secret) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Stripe webhook secret is not configured',
    })
  }
  return secret
}

export function getStripePortalConfigurationId(): string | null {
  const config = useRuntimeConfig()
  const id =
    (config.stripePortalConfigurationId as string | undefined)?.trim() ||
    process.env.STRIPE_PORTAL_CONFIGURATION_ID?.trim() ||
    ''
  return id || null
}

function normalizeOrigin(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null
  try {
    const u = new URL(raw.trim())
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    return u.origin
  } catch {
    return null
  }
}

/** Localhost, production domain, or Netlify deploy hosts — for Stripe return URLs. */
export function isAllowedReturnOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin)
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true
    if (hostname === 'beatbox.studio' || hostname === 'www.beatbox.studio') return true
    if (hostname === 'beatboxstudio.netlify.app' || hostname.endsWith('.netlify.app')) return true
    return false
  } catch {
    return false
  }
}

/**
 * Origin for Stripe success/cancel/portal return URLs.
 * Prefers the request Origin (or optional client returnOrigin) so local checkout
 * does not inherit Netlify's SITE_URL and land on an undeployed /billing page.
 */
export function getSiteUrl(event?: H3Event, returnOrigin?: string | null): string {
  const candidates: Array<string | null> = []

  if (returnOrigin) {
    candidates.push(normalizeOrigin(returnOrigin))
  }

  if (event) {
    candidates.push(normalizeOrigin(getRequestHeader(event, 'origin')))
    const referer = getRequestHeader(event, 'referer')
    if (referer) {
      candidates.push(normalizeOrigin(referer))
    }
  }

  for (const candidate of candidates) {
    if (candidate && isAllowedReturnOrigin(candidate)) {
      return candidate
    }
  }

  const config = useRuntimeConfig()
  const url = (config.public.SITE_URL as string | undefined)?.trim() || process.env.SITE_URL?.trim()
  if (!url) {
    throw createError({
      statusCode: 503,
      statusMessage: 'SITE_URL is not configured',
    })
  }
  return url.replace(/\/$/, '')
}

/** Prefer subscription item period end (newer API), fall back to top-level. */
export function getSubscriptionPeriodEnd(subscription: Stripe.Subscription): number | null {
  const itemEnd = subscription.items?.data?.[0]?.current_period_end
  if (typeof itemEnd === 'number') return itemEnd
  const top = (subscription as { current_period_end?: number }).current_period_end
  return typeof top === 'number' ? top : null
}

export function periodEndToIso(subscription: Stripe.Subscription): string | null {
  const seconds = getSubscriptionPeriodEnd(subscription)
  if (seconds == null) return null
  return new Date(seconds * 1000).toISOString()
}
