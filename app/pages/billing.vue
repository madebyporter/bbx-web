<template>
  <div class="min-h-screen bg-neutral-950 text-neutral-100">
    <div class="max-w-2xl mx-auto px-4 py-12 md:py-16 space-y-8">
      <div>
        <h1 class="text-3xl font-semibold">Billing</h1>
        <p class="mt-2 text-neutral-400">Your plan, usage, and subscription.</p>
      </div>

      <p v-if="route.query.status === 'success'" class="text-sm text-amber-400">
        {{ polling ? 'Confirming your upgrade…' : 'You are all set.' }}
      </p>

      <div v-if="loading && !entitlements" class="flex justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-amber-500" />
      </div>

      <template v-else-if="entitlements">
        <div class="border border-neutral-800 rounded-xl p-6 space-y-3 bg-neutral-900/40">
          <p class="text-sm text-neutral-500">Current plan</p>
          <h2 class="text-2xl font-semibold">{{ entitlements.plan_name }}</h2>
          <p v-if="subscription?.status" class="text-sm text-neutral-400 capitalize">
            Status: {{ subscription.status.replace('_', ' ') }}
          </p>
          <p v-if="subscription?.cancel_at_period_end && subscription.current_period_end" class="text-sm text-amber-400">
            Cancels on {{ formatDate(subscription.current_period_end) }}
          </p>
          <p v-else-if="subscription?.current_period_end && subscription.has_stripe_subscription" class="text-sm text-neutral-400">
            Renews {{ formatDate(subscription.current_period_end) }}
          </p>
          <p
            v-if="subscription?.comp_until && new Date(subscription.comp_until) > new Date()"
            class="text-sm text-amber-400"
          >
            You have {{ entitlements.plan_name }} free until {{ formatDate(subscription.comp_until) }}
          </p>
        </div>

        <div class="border border-neutral-800 rounded-xl p-6 bg-neutral-900/40">
          <h3 class="font-semibold mb-4">Usage</h3>
          <UsageMeter :entitlements="entitlements" />
        </div>

        <div class="flex flex-wrap gap-3">
          <Button
            v-if="subscription?.has_stripe_customer"
            :disabled="busy"
            @click="openPortal"
          >
            Manage billing
          </Button>
          <Button variant="secondary" @click="navigateTo('/pricing')">See plans</Button>
        </div>
      </template>

      <p v-else class="text-neutral-400">
        <NuxtLink to="/auth/signin" class="text-amber-400 hover:text-amber-300">Sign in</NuxtLink>
        to manage billing.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useAuthHeaders } from '~/composables/useAuthHeaders'
import { useEntitlements } from '~/composables/useEntitlements'
import { useAnalytics } from '~/composables/useAnalytics'

definePageMeta({
  middleware: undefined,
})

useSeoMeta({
  title: 'Billing',
  description: 'Manage your Beatbox plan and usage.',
})

const route = useRoute()
const { user } = useAuth()
const { entitlements, subscription, loading, refresh } = useEntitlements()
const { capture } = useAnalytics()
const busy = ref(false)
const polling = ref(false)
let pollTimer: ReturnType<typeof setInterval> | null = null

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

async function openPortal() {
  busy.value = true
  try {
    capture('portal_opened', { source: 'billing' })
    const headers = await useAuthHeaders()
    const res = await $fetch<{ url: string }>('/api/billing/portal', {
      method: 'POST',
      headers,
    })
    window.location.href = res.url
  } catch (err) {
    console.error(err)
  } finally {
    busy.value = false
  }
}

onMounted(async () => {
  if (!user.value) {
    await navigateTo('/auth/signin')
    return
  }
  await refresh(true)

  if (route.query.status === 'success') {
    capture('checkout_completed', {})
    polling.value = true
    let tries = 0
    pollTimer = setInterval(async () => {
      tries++
      await refresh(true)
      if (entitlements.value?.plan_slug !== 'free' || tries >= 8) {
        polling.value = false
        if (pollTimer) clearInterval(pollTimer)
      }
    }, 1500)
  }
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>
