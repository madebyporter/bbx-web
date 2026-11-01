import { computed, ref } from 'vue'
import { useAuthHeaders } from '~/composables/useAuthHeaders'
import type { Entitlements } from '~/types/billing'

export interface BillingMeResponse {
  entitlements: Entitlements
  subscription: {
    plan_id: string | null
    status: string
    billing_interval: string | null
    current_period_end: string | null
    cancel_at_period_end: boolean
    comp_plan_id: string | null
    comp_plan_slug: string | null
    comp_until: string | null
    comp_reason: string | null
    past_due_since: string | null
    has_stripe_customer: boolean
    has_stripe_subscription: boolean
  } | null
}

const me = ref<BillingMeResponse | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
let lastFetch = 0

export function useEntitlements() {
  const entitlements = computed(() => me.value?.entitlements ?? null)
  const subscription = computed(() => me.value?.subscription ?? null)

  async function refresh(force = false) {
    if (loading.value) return me.value
    if (!force && me.value && Date.now() - lastFetch < 2000) return me.value

    loading.value = true
    error.value = null
    try {
      const headers = await useAuthHeaders()
      if (!headers.Authorization) {
        me.value = null
        return null
      }
      me.value = await $fetch<BillingMeResponse>('/api/billing/me', { headers })
      lastFetch = Date.now()
      return me.value
    } catch (err: any) {
      error.value = err?.data?.statusMessage || err?.message || 'Failed to load billing'
      return null
    } finally {
      loading.value = false
    }
  }

  function has(key: string): boolean {
    const ent = entitlements.value?.entitlements
    if (!ent) return false
    return ent[key] === true
  }

  function clear() {
    me.value = null
    lastFetch = 0
  }

  return {
    me,
    entitlements,
    subscription,
    loading,
    error,
    refresh,
    has,
    clear,
  }
}

export function parsePlanLimitReason(err: unknown): 'tracks' | 'storage' | 'file_size' | null {
  const anyErr = err as any
  const reason = anyErr?.data?.data?.reason || anyErr?.data?.reason
  if (reason === 'tracks' || reason === 'storage' || reason === 'file_size') return reason

  const message =
    anyErr?.data?.statusMessage ||
    anyErr?.statusMessage ||
    anyErr?.message ||
    String(anyErr || '')

  if (message.includes('plan_limit_reached:tracks')) return 'tracks'
  if (message.includes('plan_limit_reached:storage')) return 'storage'
  if (message.includes('plan_limit_reached:file_size')) return 'file_size'
  if (message === 'plan_limit_reached') return 'tracks'
  return null
}
