<template>
  <Modal :show="show" @update:show="(v) => emit('update:show', v)">
    <template #header>
      <h2 class="text-xl font-semibold text-neutral-100">{{ title }}</h2>
    </template>

    <div class="space-y-4 text-neutral-300">
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
    </div>

    <template #footer>
      <div class="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" @click="emit('update:show', false)">Close</Button>
        <Button
          v-if="showUpgradeButton && nextPlan"
          :disabled="checkoutBusy"
          @click="startCheckout"
        >
          {{ checkoutBusy ? 'Opening…' : `Upgrade to ${nextPlan.name}` }}
        </Button>
      </div>
    </template>
  </Modal>

  <SupportPopup v-model:show="showSupport" />
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Entitlements, PlanLimitReason, PublicPlan } from '~/types/billing'
import { useAuthHeaders } from '~/composables/useAuthHeaders'
import { useAnalytics } from '~/composables/useAnalytics'
import { useAuth } from '~/composables/useAuth'

const props = defineProps<{
  show: boolean
  reason: PlanLimitReason | null
  entitlements: Entitlements | null
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
}>()

const { capture } = useAnalytics()
const { user } = useAuth()
const plans = ref<PublicPlan[]>([])
const checkoutBusy = ref(false)
const showSupport = ref(false)

watch(
  () => props.show,
  async (open) => {
    if (!open) return
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
  if (props.reason === 'file_size' && !nextPlan.value) return false
  // Higher plan with same max file does not help file_size; still allow upgrade for tracks/storage
  if (props.reason === 'file_size') return false
  return true
})

const maxFileLabel = computed(() => {
  const bytes = props.entitlements?.max_file_size_bytes || 50 * 1024 * 1024
  return `${Math.round(bytes / (1024 * 1024))} MB`
})

const title = computed(() => {
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

async function startCheckout() {
  if (!nextPlan.value) return
  if (!user.value) {
    await navigateTo('/auth/signup')
    return
  }
  checkoutBusy.value = true
  try {
    capture('checkout_started', {
      plan_slug: nextPlan.value.slug,
      interval: 'month',
    })
    const headers = await useAuthHeaders()
    const res = await $fetch<{ url: string }>('/api/billing/checkout', {
      method: 'POST',
      headers,
      body: { planSlug: nextPlan.value.slug, interval: 'month' },
    })
    if (res.url) {
      window.location.href = res.url
    }
  } catch (err) {
    console.error(err)
  } finally {
    checkoutBusy.value = false
  }
}
</script>
