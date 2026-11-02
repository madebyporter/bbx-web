<template>
  <div :class="compact ? 'space-y-4' : 'space-y-8'">
    <div class="flex justify-center">
      <div
        role="group"
        aria-label="Billing interval"
        class="inline-flex rounded-lg border border-neutral-800 p-1 bg-neutral-900"
      >
        <button
          type="button"
          class="px-4 py-2 text-sm rounded-md transition-colors"
          :class="interval === 'month' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-neutral-200'"
          :aria-pressed="interval === 'month'"
          @click="setInterval('month')"
        >
          Monthly
        </button>
        <button
          type="button"
          class="px-4 py-2 text-sm rounded-md transition-colors"
          :class="interval === 'year' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-neutral-200'"
          :aria-pressed="interval === 'year'"
          @click="setInterval('year')"
        >
          Annual
          <span v-if="showSavings" class="ml-1 text-amber-400">{{ savingsLabel }}</span>
        </button>
      </div>
    </div>

    <div
      v-if="loading"
      class="grid gap-4"
      :class="compact ? 'grid-cols-1 sm:grid-cols-2' : 'md:grid-cols-2 gap-6'"
    >
      <div
        v-for="n in 2"
        :key="n"
        class="border border-neutral-800 rounded-xl p-6 bg-neutral-900/50 animate-pulse"
        :class="compact ? 'p-4' : 'p-6'"
      >
        <div class="h-6 w-24 bg-neutral-800 rounded mb-3" />
        <div class="h-4 w-full bg-neutral-800 rounded mb-6" />
        <div class="h-8 w-20 bg-neutral-800 rounded mb-6" />
        <div class="space-y-2">
          <div class="h-3 w-3/4 bg-neutral-800 rounded" />
          <div class="h-3 w-2/3 bg-neutral-800 rounded" />
          <div class="h-3 w-1/2 bg-neutral-800 rounded" />
        </div>
        <div class="mt-8 h-10 w-full bg-neutral-800 rounded" />
      </div>
    </div>

    <div
      v-else
      class="grid gap-4"
      :class="compact ? 'grid-cols-1 sm:grid-cols-2' : 'md:grid-cols-2 gap-6'"
    >
      <div
        v-for="plan in plans"
        :key="plan.id"
        class="relative border border-neutral-800 rounded-xl bg-neutral-900/50 flex flex-col"
        :class="[
          compact ? 'p-4' : 'p-6',
          plan.badge ? 'ring-1 ring-amber-500/40' : '',
          selectedSlug === plan.slug ? 'ring-1 ring-amber-400' : '',
        ]"
      >
        <div
          v-if="plan.badge"
          class="absolute -top-3 left-6 text-xs px-2 py-1 rounded bg-amber-500 text-black font-semibold"
        >
          {{ plan.badge }}
        </div>
        <h3 class="text-2xl font-semibold" :class="compact ? 'text-xl' : 'text-2xl'">
          {{ plan.name }}
        </h3>
        <p class="mt-2 text-neutral-400 text-sm">{{ plan.description }}</p>
        <p class="mt-4 text-3xl font-semibold" :class="compact ? 'text-2xl' : 'text-3xl'">
          {{ formatPrice(plan, interval) }}
          <span
            v-if="!plan.is_default"
            class="text-base font-normal text-neutral-500"
          >
            /{{ interval === 'year' ? 'year' : 'month' }}
          </span>
        </p>
        <ul class="mt-6 space-y-2 text-sm text-neutral-300 grow">
          <li>{{ trackLimitLabel(plan) }}</li>
          <li
            v-for="(feature, i) in featuresWithoutTrack(plan)"
            :key="i"
          >
            {{ feature }}
          </li>
        </ul>
        <p
          v-if="plan.track_limit == null"
          class="mt-4 text-xs text-neutral-500"
        >
          Unlimited tracks, subject to
          <NuxtLink
            to="/pricing#fair-use"
            class="text-amber-400 hover:text-amber-300"
          >
            fair use
          </NuxtLink>
        </p>
        <div class="mt-6">
          <Button
            class="w-full"
            :class="
              plan.is_default
                ? '!bg-transparent ring-1 ring-neutral-600 text-neutral-200 hover:!bg-neutral-800'
                : ''
            "
            :variant="plan.is_default ? 'secondary' : 'primary'"
            :disabled="ctaDisabled(plan) || busySlug === plan.slug"
            @click="onSelect(plan)"
          >
            {{ ctaLabel(plan) }}
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { PublicPlan } from '~/types/billing'
import { useAuth } from '~/composables/useAuth'
import { useEntitlements } from '~/composables/useEntitlements'
import { usePlans, type BillingInterval } from '~/composables/usePlans'
import { useAnalytics } from '~/composables/useAnalytics'

const props = withDefaults(
  defineProps<{
    source: 'landing' | 'pricing_page' | 'auth_modal'
    compact?: boolean
    selectedSlug?: string | null
  }>(),
  {
    compact: false,
    selectedSlug: null,
  },
)

const emit = defineEmits<{
  select: [{ plan: string; interval: BillingInterval }]
}>()

const { user } = useAuth()
const { entitlements, refresh } = useEntitlements()
const { plans, loading, formatPrice, trackLimitLabel, ensureLoaded } = usePlans()
const { capture } = useAnalytics()

const interval = ref<BillingInterval>('month')
const busySlug = ref('')
const viewed = ref(false)

ensureLoaded()

const showSavings = computed(() => {
  return plans.value.some((plan) => {
    if (!plan.price_annual_cents || !plan.price_monthly_cents) return false
    return plan.price_annual_cents < plan.price_monthly_cents * 12
  })
})

const savingsLabel = computed(() => {
  const paid = plans.value.find((p) => p.price_annual_cents && p.price_monthly_cents)
  if (!paid?.price_annual_cents || !paid.price_monthly_cents) return '2 months free'
  const yearlyAtMonthly = paid.price_monthly_cents * 12
  const savedMonths = Math.round(
    (yearlyAtMonthly - paid.price_annual_cents) / paid.price_monthly_cents,
  )
  if (savedMonths >= 2) return '2 months free'
  if (savedMonths === 1) return '1 month free'
  const pct = Math.round(((yearlyAtMonthly - paid.price_annual_cents) / yearlyAtMonthly) * 100)
  return pct > 0 ? `Save ${pct}%` : ''
})

function featuresWithoutTrack(plan: PublicPlan): string[] {
  const trackLabel = trackLimitLabel(plan).toLowerCase()
  return (plan.features || []).filter((f) => f.toLowerCase() !== trackLabel)
}

function isCurrent(plan: PublicPlan) {
  return entitlements.value?.plan_slug === plan.slug
}

function isPaying() {
  return Boolean(
    entitlements.value &&
      entitlements.value.plan_slug !== 'free' &&
      !entitlements.value.plan_slug?.startsWith('stub'),
  )
}

function ctaLabel(plan: PublicPlan) {
  if (user.value) {
    if (isCurrent(plan)) return 'Current plan'
    if (isPaying()) return 'Manage billing'
    if (!plan.is_default) return `Upgrade to ${plan.name}`
    return 'Current plan'
  }
  if (plan.is_default) return 'Sign up free'
  return `Sign up for ${plan.name}`
}

function ctaDisabled(plan: PublicPlan) {
  if (!user.value) return false
  if (isCurrent(plan)) return true
  if (plan.is_default) return true
  return false
}

function setInterval(next: BillingInterval) {
  if (interval.value === next) return
  interval.value = next
  capture('pricing_interval_toggled', { interval: next, source: props.source })
}

function onSelect(plan: PublicPlan) {
  if (user.value && isCurrent(plan)) return
  busySlug.value = plan.slug
  emit('select', { plan: plan.slug, interval: interval.value })
  capture('plan_selected', {
    plan: plan.slug,
    interval: interval.value,
    source: props.source,
  })
  // Parent may navigate away; clear busy after a beat
  setTimeout(() => {
    busySlug.value = ''
  }, 800)
}

watch(
  () => plans.value.length,
  (len) => {
    if (len > 0 && !viewed.value) {
      viewed.value = true
      capture('pricing_viewed', { source: props.source })
    }
  },
  { immediate: true },
)

watch(
  () => user.value,
  (u) => {
    if (u) void refresh()
  },
  { immediate: true },
)

defineExpose({ interval })
</script>
