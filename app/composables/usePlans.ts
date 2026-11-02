import { computed, onMounted, ref, type Ref } from 'vue'
import type { PublicPlan } from '~/types/billing'
import { STUB_BILLING_PLANS } from '~/utils/billingStub'

export type BillingInterval = 'month' | 'year'

const sharedPlans: Ref<PublicPlan[]> = ref([])
const sharedLoading = ref(false)
const sharedLoaded = ref(false)
const sharedUsingStub = ref(false)
let fetchPromise: Promise<void> | null = null

function isBillingEnabled(): boolean {
  const config = useRuntimeConfig()
  return String(config.public.billingEnabled) === 'true'
}

async function fetchPlans(): Promise<void> {
  if (sharedLoaded.value || sharedLoading.value) return
  if (fetchPromise) return fetchPromise

  sharedLoading.value = true
  fetchPromise = (async () => {
    try {
      if (!isBillingEnabled()) {
        sharedPlans.value = STUB_BILLING_PLANS
        sharedUsingStub.value = true
        sharedLoaded.value = true
        return
      }

      const data = await $fetch<{ plans: PublicPlan[] }>('/api/billing/plans')
      sharedPlans.value = Array.isArray(data?.plans) ? data.plans : []
      sharedUsingStub.value = false
      sharedLoaded.value = true
    } catch (err: any) {
      const status = err?.statusCode || err?.status || err?.response?.status
      if (status === 404 || !isBillingEnabled()) {
        sharedPlans.value = STUB_BILLING_PLANS
        sharedUsingStub.value = true
        sharedLoaded.value = true
        return
      }
      console.error('Failed to load billing plans', err)
      sharedPlans.value = STUB_BILLING_PLANS
      sharedUsingStub.value = true
      sharedLoaded.value = true
    } finally {
      sharedLoading.value = false
      fetchPromise = null
    }
  })()

  return fetchPromise
}

export function usePlans() {
  const plans = computed(() => sharedPlans.value)
  const loading = computed(() => sharedLoading.value && !sharedLoaded.value)
  const usingStub = computed(() => sharedUsingStub.value)

  const defaultPlan = computed(
    () => sharedPlans.value.find((p) => p.is_default) || sharedPlans.value[0] || null,
  )

  const paidPlans = computed(() => sharedPlans.value.filter((p) => !p.is_default))

  function findPlan(slug: string | null | undefined): PublicPlan | null {
    if (!slug) return null
    return sharedPlans.value.find((p) => p.slug === slug) || null
  }

  function formatPrice(plan: PublicPlan, interval: BillingInterval): string {
    if (plan.is_default || plan.price_monthly_cents === 0) return 'Free'
    const cents =
      interval === 'year' && plan.price_annual_cents != null
        ? plan.price_annual_cents
        : plan.price_monthly_cents
    return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`
  }

  function trackLimitLabel(plan: PublicPlan): string {
    if (plan.track_limit == null) return 'Unlimited tracks'
    return `${plan.track_limit} tracks`
  }

  async function ensureLoaded() {
    if (!import.meta.client) return
    await fetchPlans()
  }

  onMounted(() => {
    void ensureLoaded()
  })

  if (import.meta.client && !sharedLoaded.value && !sharedLoading.value) {
    void fetchPlans()
  }

  return {
    plans,
    loading,
    usingStub,
    defaultPlan,
    paidPlans,
    findPlan,
    formatPrice,
    trackLimitLabel,
    ensureLoaded,
    refresh: async () => {
      sharedLoaded.value = false
      sharedPlans.value = []
      await fetchPlans()
    },
  }
}
