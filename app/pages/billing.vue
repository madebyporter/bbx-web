<template>
  <div class="min-h-screen bg-neutral-900 text-neutral-100">
    <div class="max-w-md mx-auto px-4 py-16 space-y-6 text-center">
      <h1 class="text-2xl font-semibold">
        {{ route.query.status === 'success' ? 'Upgrade confirmed' : 'Billing' }}
      </h1>
      <p class="text-neutral-400">
        {{
          route.query.status === 'success'
            ? polling
              ? 'Confirming your upgrade…'
              : "You're all set. Plan and usage live in Settings."
            : 'Plan, usage, and Manage billing are in Settings.'
        }}
      </p>
      <div class="flex flex-wrap justify-center gap-3">
        <Button @click="goHome">Continue</Button>
        <Button variant="secondary" @click="navigateTo('/pricing')">See plans</Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useAuth } from '~/composables/useAuth'
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
const { entitlements, refresh } = useEntitlements()
const { capture } = useAnalytics()
const polling = ref(false)
let pollTimer: ReturnType<typeof setInterval> | null = null

function goHome() {
  void navigateTo('/')
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
