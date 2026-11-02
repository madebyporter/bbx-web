import { computed } from 'vue'
import type { RouteLocationNormalizedLoaded } from 'vue-router'
import { usePlans, type BillingInterval } from '~/composables/usePlans'

export const SIGNUP_INTENT_KEY = 'bbx_signup_intent'
const INTENT_TTL_MS = 7 * 24 * 60 * 60 * 1000

export interface SignupIntent {
  plan: string
  interval: BillingInterval
  source: string
  createdAt: number
}

function isInterval(value: unknown): value is BillingInterval {
  return value === 'month' || value === 'year'
}

function parseStored(raw: string | null): SignupIntent | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as SignupIntent
    if (!parsed?.plan || !isInterval(parsed.interval) || !parsed.createdAt) return null
    if (Date.now() - parsed.createdAt > INTENT_TTL_MS) return null
    return {
      plan: String(parsed.plan),
      interval: parsed.interval,
      source: String(parsed.source || ''),
      createdAt: Number(parsed.createdAt),
    }
  } catch {
    return null
  }
}

function readLocal(): SignupIntent | null {
  if (!import.meta.client) return null
  return parseStored(localStorage.getItem(SIGNUP_INTENT_KEY))
}

function writeLocal(intent: SignupIntent | null) {
  if (!import.meta.client) return
  if (!intent) {
    localStorage.removeItem(SIGNUP_INTENT_KEY)
    return
  }
  localStorage.setItem(SIGNUP_INTENT_KEY, JSON.stringify(intent))
}

export function useSignupIntent() {
  const intent = useState<SignupIntent | null>('signupIntent', () => readLocal())
  const { findPlan, defaultPlan, ensureLoaded } = usePlans()

  if (import.meta.client && !intent.value) {
    const stored = readLocal()
    if (stored) intent.value = stored
  }

  const isPaid = computed(() => {
    if (!intent.value) return false
    const plan = findPlan(intent.value.plan)
    if (!plan) return false
    return !plan.is_default
  })

  async function set(partial: {
    plan: string
    interval?: BillingInterval
    source?: string
  }): Promise<SignupIntent | null> {
    await ensureLoaded()
    const plan = findPlan(partial.plan)
    if (!plan) return null

    const next: SignupIntent = {
      plan: plan.slug,
      interval: partial.interval && isInterval(partial.interval) ? partial.interval : 'month',
      source: partial.source || intent.value?.source || '',
      createdAt: Date.now(),
    }
    intent.value = next
    writeLocal(next)
    return next
  }

  function clear() {
    intent.value = null
    writeLocal(null)
  }

  function toQuery(): { plan?: string; interval?: BillingInterval } {
    if (!intent.value) return {}
    return {
      plan: intent.value.plan,
      interval: intent.value.interval,
    }
  }

  /**
   * Reads plan/interval from the URL. Unknown or hidden slugs (e.g. studio) are ignored.
   * Defaults interval to month. Returns null when nothing valid is present.
   */
  async function readFromQuery(
    route: RouteLocationNormalizedLoaded,
  ): Promise<SignupIntent | null> {
    await ensureLoaded()
    const planParam = typeof route.query.plan === 'string' ? route.query.plan : null
    const intervalParam =
      typeof route.query.interval === 'string' && isInterval(route.query.interval)
        ? route.query.interval
        : 'month'

    const plan = findPlan(planParam)
    if (!plan) return null

    const next: SignupIntent = {
      plan: plan.slug,
      interval: intervalParam,
      source: intent.value?.source || 'query',
      createdAt: Date.now(),
    }
    intent.value = next
    writeLocal(next)
    return next
  }

  function isDefaultSlug(slug: string | null | undefined): boolean {
    if (!slug) return true
    const plan = findPlan(slug)
    if (plan) return plan.is_default
    return defaultPlan.value?.slug === slug
  }

  return {
    intent,
    isPaid,
    set,
    clear,
    toQuery,
    readFromQuery,
    isDefaultSlug,
  }
}
