<template>
  <div class="min-h-screen bg-neutral-900 text-neutral-100">
    <div class="max-w-5xl mx-auto px-4 py-12 md:py-16">
      <div class="text-center mb-10">
        <h1 class="text-3xl md:text-4xl font-semibold tracking-tight">Pricing</h1>
        <p class="mt-3 text-neutral-400 max-w-xl mx-auto">
          Start free. Upgrade when you need unlimited tracks.
        </p>
      </div>

      <p v-if="statusMessage" class="text-center text-sm text-neutral-400 mb-6">{{ statusMessage }}</p>

      <PricingPlans source="pricing_page" @select="onPlanSelect" />

      <section id="fair-use" class="mt-16 max-w-2xl mx-auto">
        <h2 class="text-xl font-semibold mb-4">FAQ</h2>
        <div class="space-y-4 text-neutral-300 text-sm">
          <div>
            <h3 class="font-medium text-white">Is Pro really unlimited?</h3>
            <p class="mt-2 text-neutral-400">
              Yes for normal use. You can upload as many tracks as you like. To keep Beatbox fast and affordable for everyone, we have a generous fair use limit that almost nobody reaches. If you get close, we'll reach out before anything changes.
            </p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onMounted } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useEntitlements } from '~/composables/useEntitlements'
import { useCheckout } from '~/composables/useCheckout'
import { usePlans, type BillingInterval } from '~/composables/usePlans'
import { useSignupIntent } from '~/composables/useSignupIntent'
import { useToast } from '~/composables/useToast'
import { useAnalytics } from '~/composables/useAnalytics'

useSeoMeta({
  title: 'Pricing',
  description: 'Beatbox plans: Free for getting started, Pro for unlimited tracks.',
})

const route = useRoute()
const { user } = useAuth()
const { entitlements, refresh } = useEntitlements()
const { startCheckout, openPortal } = useCheckout()
const { findPlan, ensureLoaded } = usePlans()
const { set: setIntent } = useSignupIntent()
const { showInfo } = useToast()
const { capture } = useAnalytics()

type OpenAuthModal = (
  mode?: 'signin' | 'signup' | 'forgot',
  opts?: { plan?: string; interval?: BillingInterval; source?: string },
) => void

const openAuthModal = inject<OpenAuthModal>('openAuthModal', () => {})

const statusMessage = computed(() => {
  if (route.query.status === 'canceled') return 'Checkout canceled. No changes were made.'
  return ''
})

async function onPlanSelect(payload: { plan: string; interval: BillingInterval }) {
  const plan = findPlan(payload.plan)
  if (!plan) return

  if (!user.value) {
    await setIntent({ plan: plan.slug, interval: payload.interval, source: 'pricing_page' })
    openAuthModal('signup', {
      plan: plan.slug,
      interval: payload.interval,
      source: 'pricing_page',
    })
    return
  }

  if (entitlements.value?.plan_slug === plan.slug) {
    showInfo(`You're already on ${plan.name}.`)
    return
  }

  if (plan.is_default) return

  const paying =
    entitlements.value &&
    entitlements.value.plan_slug !== 'free' &&
    Boolean(entitlements.value.plan_slug)

  if (paying) {
    capture('portal_opened', { source: 'pricing' })
    await openPortal()
    return
  }

  capture('checkout_started', {
    plan: plan.slug,
    interval: payload.interval,
    context: 'pricing',
    plan_slug: plan.slug,
  })
  await startCheckout({
    plan: plan.slug,
    interval: payload.interval,
    context: 'pricing',
  })
}

onMounted(async () => {
  ensureLoaded()
  if (user.value) await refresh()
})
</script>
