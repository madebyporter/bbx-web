<template>
  <div class="min-h-screen bg-neutral-900 text-neutral-100">
    <div class="max-w-md mx-auto px-4 py-16 space-y-6 text-center">
      <h1 class="text-2xl font-semibold">
        {{ heading }}
      </h1>
      <p class="text-neutral-400">
        {{ body }}
      </p>
      <div class="flex flex-wrap justify-center gap-3">
        <Button v-if="isWelcomeSuccess && !polling" @click="openUpload">
          Upload your first track
        </Button>
        <Button v-else @click="goHome">Continue</Button>
        <Button variant="secondary" @click="navigateTo('/pricing')">See plans</Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useEntitlements } from '~/composables/useEntitlements'
import { useAnalytics } from '~/composables/useAnalytics'
import { useSignupIntent } from '~/composables/useSignupIntent'
import { usePlans } from '~/composables/usePlans'

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
const signupIntent = useSignupIntent()
const { findPlan } = usePlans()
const polling = ref(false)
const completedCaptured = ref(false)
let pollTimer: ReturnType<typeof setInterval> | null = null

const isWelcomeSuccess = computed(
  () => route.query.status === 'success' && route.query.welcome === '1',
)

const planLabel = computed(() => {
  const slug = entitlements.value?.plan_slug
  if (slug && slug !== 'free') return entitlements.value?.plan_name || findPlan(slug)?.name || 'Pro'
  return signupIntent.intent.value
    ? findPlan(signupIntent.intent.value.plan)?.name || 'Pro'
    : 'Pro'
})

const heading = computed(() => {
  if (route.query.status === 'success') {
    if (isWelcomeSuccess.value && !polling.value) return `You're on ${planLabel.value}`
    return 'Upgrade confirmed'
  }
  return 'Billing'
})

const body = computed(() => {
  if (route.query.status === 'success') {
    if (polling.value) return 'Confirming your upgrade…'
    if (isWelcomeSuccess.value) {
      return `You're on ${planLabel.value}. Let's upload your first track.`
    }
    return "You're all set. Plan and usage live in Settings."
  }
  return 'Plan, usage, and Manage billing are in Settings.'
})

function goHome() {
  void navigateTo('/')
}

function openUpload() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('open-upload-modal'))
  }
  void navigateTo('/')
}

onMounted(async () => {
  if (!user.value) {
    await navigateTo('/?auth=signin')
    return
  }
  await refresh(true)

  if (route.query.status === 'success') {
    polling.value = true
    let tries = 0
    const checkDone = async () => {
      tries++
      await refresh(true)
      const upgraded = entitlements.value?.plan_slug && entitlements.value.plan_slug !== 'free'
      if (upgraded || tries >= 8) {
        polling.value = false
        if (pollTimer) clearInterval(pollTimer)
        if (upgraded && !completedCaptured.value) {
          completedCaptured.value = true
          const intent = signupIntent.intent.value
          capture('checkout_completed', {
            plan: entitlements.value?.plan_slug || intent?.plan,
            interval: intent?.interval,
          })
          signupIntent.clear()
        }
      }
    }
    await checkDone()
    if (polling.value) {
      pollTimer = setInterval(() => {
        void checkDone()
      }, 1500)
    }
  }
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>
