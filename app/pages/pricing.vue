<template>
  <div class="min-h-screen bg-neutral-900 text-neutral-100">
    <div class="max-w-5xl mx-auto px-4 py-12 md:py-16">
      <div class="text-center mb-10">
        <h1 class="text-3xl md:text-4xl font-semibold tracking-tight">Pricing</h1>
        <p class="mt-3 text-neutral-400 max-w-xl mx-auto">
          Start free. Upgrade when you need unlimited tracks.
        </p>

        <div class="mt-6 inline-flex rounded-lg border border-neutral-800 p-1 bg-neutral-900">
          <button
            type="button"
            class="px-4 py-2 text-sm rounded-md"
            :class="interval === 'month' ? 'bg-neutral-800 text-white' : 'text-neutral-400'"
            @click="interval = 'month'"
          >
            Monthly
          </button>
          <button
            type="button"
            class="px-4 py-2 text-sm rounded-md"
            :class="interval === 'year' ? 'bg-neutral-800 text-white' : 'text-neutral-400'"
            @click="interval = 'year'"
          >
            Annual
            <span v-if="showTwoMonthsFree" class="ml-1 text-amber-400">2 months free</span>
          </button>
        </div>
      </div>

      <p v-if="statusMessage" class="text-center text-sm text-neutral-400 mb-6">{{ statusMessage }}</p>

      <div class="grid md:grid-cols-2 gap-6">
        <div
          v-for="plan in plans"
          :key="plan.id"
          class="relative border border-neutral-800 rounded-xl p-6 bg-neutral-900/50 flex flex-col"
          :class="plan.badge ? 'ring-1 ring-amber-500/40' : ''"
        >
          <div v-if="plan.badge" class="absolute -top-3 left-6 text-xs px-2 py-1 rounded bg-amber-500 text-black font-semibold">
            {{ plan.badge }}
          </div>
          <h2 class="text-2xl font-semibold">{{ plan.name }}</h2>
          <p class="mt-2 text-neutral-400 text-sm grow-0">{{ plan.description }}</p>
          <p class="mt-4 text-3xl font-semibold">
            {{ priceLabel(plan) }}
            <span v-if="!plan.is_default" class="text-base font-normal text-neutral-500">
              /{{ interval === 'year' ? 'year' : 'month' }}
            </span>
          </p>
          <ul class="mt-6 space-y-2 text-sm text-neutral-300">
            <li v-for="(feature, i) in plan.features || []" :key="i">{{ feature }}</li>
          </ul>
          <p v-if="plan.slug === 'pro'" class="mt-4 text-xs text-neutral-500">
            Unlimited tracks, subject to our
            <a href="#fair-use" class="text-amber-400 hover:text-amber-300">fair use policy</a>.
          </p>
          <div class="mt-8">
            <Button
              class="w-full"
              :variant="ctaVariant(plan)"
              :disabled="ctaDisabled(plan) || busySlug === plan.slug"
              @click="onPlanCta(plan)"
            >
              {{ ctaLabel(plan) }}
            </Button>
          </div>
        </div>
      </div>

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
import { computed, onMounted, ref } from 'vue'
import type { PublicPlan } from '~/types/billing'
import { useAuth } from '~/composables/useAuth'
import { useAuthHeaders } from '~/composables/useAuthHeaders'
import { useEntitlements } from '~/composables/useEntitlements'
import { useAnalytics } from '~/composables/useAnalytics'

useSeoMeta({
  title: 'Pricing',
  description: 'Beatbox plans: Free for getting started, Pro for unlimited tracks.',
})

const route = useRoute()
const { user } = useAuth()
const { entitlements, refresh } = useEntitlements()
const { capture } = useAnalytics()

const { data } = await useFetch<{ plans: PublicPlan[] }>('/api/billing/plans')
const plans = computed(() => data.value?.plans || [])
const interval = ref<'month' | 'year'>('month')
const busySlug = ref('')

const statusMessage = computed(() => {
  if (route.query.status === 'canceled') return 'Checkout canceled. No changes were made.'
  return ''
})

const showTwoMonthsFree = computed(() => {
  const pro = plans.value.find((p) => p.slug === 'pro')
  if (!pro?.price_annual_cents || !pro.price_monthly_cents) return false
  return pro.price_annual_cents < pro.price_monthly_cents * 12
})

function priceLabel(plan: PublicPlan) {
  if (plan.is_default || plan.price_monthly_cents === 0) return 'Free'
  const cents =
    interval.value === 'year' && plan.price_annual_cents != null
      ? plan.price_annual_cents
      : plan.price_monthly_cents
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`
}

function isCurrent(plan: PublicPlan) {
  return entitlements.value?.plan_slug === plan.slug
}

function ctaLabel(plan: PublicPlan) {
  if (!user.value) return plan.is_default ? 'Get started' : 'Upgrade'
  if (isCurrent(plan)) return 'Current plan'
  if (plan.is_default) return 'Included in free'
  if (entitlements.value && entitlements.value.plan_slug !== 'free') {
    return 'Switch plan'
  }
  return 'Upgrade'
}

function ctaVariant(plan: PublicPlan) {
  return plan.badge ? 'primary' : 'secondary'
}

function ctaDisabled(plan: PublicPlan) {
  if (!user.value) return false
  if (isCurrent(plan)) return true
  if (plan.is_default) return true
  return false
}

async function onPlanCta(plan: PublicPlan) {
  if (!user.value) {
    await navigateTo('/auth/signup')
    return
  }
  if (plan.is_default || isCurrent(plan)) return

  busySlug.value = plan.slug
  try {
    const headers = await useAuthHeaders()
    const paid = entitlements.value && entitlements.value.plan_slug !== 'free'
    if (paid) {
      capture('portal_opened', { source: 'pricing' })
      const res = await $fetch<{ url: string }>('/api/billing/portal', {
        method: 'POST',
        headers,
        body: { returnOrigin: window.location.origin },
      })
      window.location.href = res.url
      return
    }
    capture('checkout_started', { plan_slug: plan.slug, interval: interval.value })
    const res = await $fetch<{ url: string }>('/api/billing/checkout', {
      method: 'POST',
      headers,
      body: {
        planSlug: plan.slug,
        interval: interval.value,
        returnOrigin: window.location.origin,
      },
    })
    window.location.href = res.url
  } catch (err) {
    console.error(err)
  } finally {
    busySlug.value = ''
  }
}

onMounted(async () => {
  capture('pricing_viewed', {})
  if (user.value) await refresh()
})
</script>
