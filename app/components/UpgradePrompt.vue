<template>
  <Modal :show="show" @update:show="onShowUpdate">
    <template #header>
      <h2 class="text-xl font-semibold text-neutral-100">{{ title }}</h2>
    </template>

    <div class="space-y-4 text-neutral-300">
      <template v-if="phase === 'success'">
        <p>
          You're on {{ upgradedPlanName }}. Unlimited uploads are unlocked.
          Close this window to continue uploading.
        </p>
      </template>

      <template v-else-if="phase === 'waiting'">
        <p>
          Complete checkout in the other tab. This window will update when your payment goes through.
        </p>
        <p class="text-sm text-neutral-500">
          {{ waitingHint }}
        </p>
      </template>

      <template v-else>
        <p>{{ body }}</p>

        <div v-if="nextPlan && showUpgradeButton" class="rounded border border-neutral-800 p-4">
          <p class="font-medium text-white">{{ nextPlan.name }}</p>
          <p class="text-sm text-neutral-400 mt-1">
            {{ formatMoney(nextPlan.price_monthly_cents) }}/month
            <template v-if="nextPlan.price_annual_cents != null">
              or {{ formatMoney(nextPlan.price_annual_cents) }}/year
            </template>
          </p>
          <ul class="mt-3 text-sm space-y-1">
            <li v-for="(feature, i) in nextPlan.features || []" :key="i">{{ feature }}</li>
          </ul>
        </div>

        <p v-if="!showUpgradeButton && reason === 'file_size'">
          Files can be up to {{ maxFileLabel }}. Try exporting a 320 kbps MP3.
        </p>
        <p v-else-if="!showUpgradeButton && reason === 'storage'">
          You've reached the fair use limit. Delete some tracks or
          <button type="button" class="text-amber-400 hover:text-amber-300 underline" @click="openSupport">
            contact us
          </button>
          and we'll sort it out.
        </p>
      </template>
    </div>

    <template #footer>
      <div class="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" @click="closeModal">
          {{ phase === 'success' ? 'Continue uploading' : 'Close' }}
        </Button>
        <Button
          v-if="phase === 'limit' && showUpgradeButton && nextPlan"
          :disabled="checkoutBusy"
          @click="startCheckout"
        >
          {{ checkoutBusy ? 'Opening…' : `Upgrade to ${nextPlan.name}` }}
        </Button>
        <Button
          v-else-if="phase === 'waiting'"
          variant="secondary"
          :disabled="checkoutBusy"
          @click="startCheckout"
        >
          Reopen checkout
        </Button>
      </div>
    </template>
  </Modal>

  <SupportPopup v-model:show="showSupport" />
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import type { Entitlements, PlanLimitReason, PublicPlan } from '~/types/billing'
import { useAuthHeaders } from '~/composables/useAuthHeaders'
import { useAnalytics } from '~/composables/useAnalytics'
import { useAuth } from '~/composables/useAuth'
import { useEntitlements } from '~/composables/useEntitlements'

type Phase = 'limit' | 'waiting' | 'success'

const props = defineProps<{
  show: boolean
  reason: PlanLimitReason | null
  entitlements: Entitlements | null
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  upgraded: []
}>()

const { capture } = useAnalytics()
const { user } = useAuth()
const { refresh } = useEntitlements()
const plans = ref<PublicPlan[]>([])
const checkoutBusy = ref(false)
const showSupport = ref(false)
const phase = ref<Phase>('limit')
const upgradedPlanName = ref('Pro')
const waitingHint = ref('Waiting for confirmation…')
const baselinePlanSlug = ref<string | null>(null)
const pendingUpgradedClose = ref(false)

let pollTimer: ReturnType<typeof setInterval> | null = null

watch(
  () => props.show,
  async (open) => {
    if (!open) {
      stopPolling()
      return
    }
    phase.value = 'limit'
    pendingUpgradedClose.value = false
    baselinePlanSlug.value = props.entitlements?.plan_slug || 'free'
    capture('upgrade_prompt_shown', { reason: props.reason || 'tracks' })
    if (!plans.value.length) {
      const res = await $fetch<{ plans: PublicPlan[] }>('/api/billing/plans')
      plans.value = res.plans || []
    }
  },
)

const nextPlan = computed(() => {
  const currentSlug = props.entitlements?.plan_slug
  const ordered = [...plans.value].sort((a, b) => a.sort_order - b.sort_order)
  const idx = ordered.findIndex((p) => p.slug === currentSlug)
  if (idx >= 0) return ordered.slice(idx + 1).find((p) => !p.is_default) || null
  return ordered.find((p) => !p.is_default) || null
})

const showUpgradeButton = computed(() => {
  if (!nextPlan.value) return false
  if (props.reason === 'storage' && props.entitlements?.tracks_unlimited) return false
  if (props.reason === 'file_size') return false
  return true
})

const maxFileLabel = computed(() => {
  const bytes = props.entitlements?.max_file_size_bytes || 50 * 1024 * 1024
  return `${Math.round(bytes / (1024 * 1024))} MB`
})

const title = computed(() => {
  if (phase.value === 'success') return 'Upgrade successful'
  if (phase.value === 'waiting') return 'Finish checkout'
  if (props.reason === 'storage') return 'Storage limit reached'
  if (props.reason === 'file_size') return 'File is too large'
  return 'Track limit reached'
})

const body = computed(() => {
  const e = props.entitlements
  const next = nextPlan.value
  if (props.reason === 'tracks' && e && e.track_limit != null) {
    const unlimitedNext = next?.track_limit == null
    return unlimitedNext
      ? `You've used all ${e.track_limit} tracks on ${e.plan_name}. Upgrade to ${next?.name || 'Pro'} for unlimited tracks.`
      : `You've used all ${e.track_limit} tracks on ${e.plan_name}. Upgrade to keep uploading.`
  }
  if (props.reason === 'storage') {
    return `You're out of storage on ${e?.plan_name || 'your plan'}.`
  }
  if (props.reason === 'file_size') {
    return `This file is larger than the ${maxFileLabel.value} limit.`
  }
  return 'You have reached a plan limit.'
})

function formatMoney(cents: number) {
  return `$${(Number(cents || 0) / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`
}

function openSupport() {
  showSupport.value = true
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  if (typeof window !== 'undefined') {
    window.removeEventListener('focus', checkForUpgrade)
    document.removeEventListener('visibilitychange', onVisibility)
  }
}

function onVisibility() {
  if (document.visibilityState === 'visible') {
    void checkForUpgrade()
  }
}

function startPolling() {
  stopPolling()
  void checkForUpgrade()
  pollTimer = setInterval(() => {
    void checkForUpgrade()
  }, 2000)
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', checkForUpgrade)
    document.addEventListener('visibilitychange', onVisibility)
  }
}

async function checkForUpgrade() {
  if (phase.value === 'success') return
  const me = await refresh(true)
  const ent = me?.entitlements
  if (!ent) {
    waitingHint.value = 'Still waiting for confirmation…'
    return
  }

  const baseline = baselinePlanSlug.value || 'free'
  const upgraded = ent.plan_slug !== baseline || (baseline === 'free' && ent.tracks_unlimited)

  if (upgraded) {
    phase.value = 'success'
    upgradedPlanName.value = ent.plan_name || nextPlan.value?.name || 'Pro'
    pendingUpgradedClose.value = true
    capture('checkout_completed', {})
    stopPolling()
    waitingHint.value = ''
  } else {
    waitingHint.value = 'Still waiting for confirmation…'
  }
}

async function startCheckout() {
  if (!nextPlan.value) return
  if (!user.value) {
    await navigateTo('/auth/signup')
    return
  }
  checkoutBusy.value = true
  try {
    capture('checkout_started', {
      plan: nextPlan.value.slug,
      interval: 'month',
      context: 'upgrade',
      plan_slug: nextPlan.value.slug,
    })
    const headers = await useAuthHeaders()
    const res = await $fetch<{ url: string }>('/api/billing/checkout', {
      method: 'POST',
      headers,
      body: {
        planSlug: nextPlan.value.slug,
        interval: 'month',
        context: 'upgrade',
        returnOrigin: window.location.origin,
      },
    })
    if (!res.url) return

    const tab = window.open(res.url, '_blank', 'noopener,noreferrer')
    if (!tab) {
      // Popup blocked: fall back to same-tab redirect
      window.location.href = res.url
      return
    }

    baselinePlanSlug.value = props.entitlements?.plan_slug || 'free'
    phase.value = 'waiting'
    waitingHint.value = 'Checkout opened in a new tab. Waiting for confirmation…'
    startPolling()
  } catch (err) {
    console.error(err)
  } finally {
    checkoutBusy.value = false
  }
}

function closeModal() {
  const shouldResume = pendingUpgradedClose.value
  pendingUpgradedClose.value = false
  stopPolling()
  phase.value = 'limit'
  emit('update:show', false)
  if (shouldResume) {
    emit('upgraded')
  }
}

function onShowUpdate(value: boolean) {
  if (value) {
    emit('update:show', true)
    return
  }
  // Modal X / backdrop: same resume path as the footer button
  closeModal()
}

onUnmounted(() => {
  stopPolling()
})
</script>
