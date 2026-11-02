<template>
  <div
    v-if="visible"
    class="fixed bottom-0 inset-x-0 z-40 border-t border-neutral-800 bg-neutral-900/95 backdrop-blur px-4 py-3"
  >
    <div class="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm text-neutral-200">
        You're on Free. Want to finish setting up {{ planName }}?
      </p>
      <div class="flex items-center gap-2">
        <Button size="sm" :disabled="busy" @click="onFinish">
          {{ busy ? 'Opening...' : 'Finish upgrading' }}
        </Button>
        <Button size="sm" variant="ghost" @click="onDismiss">Not now</Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useEntitlements } from '~/composables/useEntitlements'
import { useSignupIntent } from '~/composables/useSignupIntent'
import { useCheckout } from '~/composables/useCheckout'
import { usePlans } from '~/composables/usePlans'
import { useAnalytics } from '~/composables/useAnalytics'

const DISMISS_KEY = 'bbx_finish_upgrade_dismissed_until'
const SESSION_SHOWN_KEY = 'bbx_finish_upgrade_shown_session'

const { user } = useAuth()
const { entitlements, refresh } = useEntitlements()
const signupIntent = useSignupIntent()
const { startCheckout } = useCheckout()
const { findPlan, ensureLoaded } = usePlans()
const { capture } = useAnalytics()
const route = useRoute()

const busy = ref(false)
const dismissedLocally = ref(false)
const sessionShown = ref(false)
const shownCaptured = ref(false)

const planName = computed(() => {
  const slug = signupIntent.intent.value?.plan
  return findPlan(slug)?.name || 'Pro'
})

const visible = computed(() => {
  if (!import.meta.client) return false
  if (!user.value) return false
  if (dismissedLocally.value) return false
  if (!signupIntent.isPaid.value || !signupIntent.intent.value) return false
  if (entitlements.value && entitlements.value.plan_slug !== 'free') return false

  const until = Number(localStorage.getItem(DISMISS_KEY) || 0)
  if (until && Date.now() < until) return false

  // After first show in a session, keep showing until dismiss; gate initial reveal
  if (sessionStorage.getItem(SESSION_SHOWN_KEY) === '1' && !sessionShown.value) {
    // Already shown this session earlier; allow once more only if upgrade=canceled just landed
    if (route.query.upgrade !== 'canceled') return false
  }

  return true
})

watch(visible, (isVisible) => {
  if (!isVisible || shownCaptured.value) return
  shownCaptured.value = true
  sessionShown.value = true
  sessionStorage.setItem(SESSION_SHOWN_KEY, '1')
  const intent = signupIntent.intent.value
  if (intent) {
    capture('finish_upgrade_banner_shown', {
      plan: intent.plan,
      interval: intent.interval,
    })
  }
})

async function onFinish() {
  const intent = signupIntent.intent.value
  if (!intent) return
  busy.value = true
  capture('finish_upgrade_banner_clicked', {
    plan: intent.plan,
    interval: intent.interval,
  })
  capture('checkout_started', {
    plan: intent.plan,
    interval: intent.interval,
    context: 'upgrade',
    plan_slug: intent.plan,
  })
  try {
    await startCheckout({
      plan: intent.plan,
      interval: intent.interval,
      context: 'upgrade',
    })
  } finally {
    busy.value = false
  }
}

function onDismiss() {
  const intent = signupIntent.intent.value
  if (intent) {
    capture('finish_upgrade_banner_dismissed', {
      plan: intent.plan,
      interval: intent.interval,
    })
  }
  localStorage.setItem(DISMISS_KEY, String(Date.now() + 7 * 24 * 60 * 60 * 1000))
  dismissedLocally.value = true
  // Keep intent for retry later unless they dismiss for good - plan says clear when dismissed for good
  signupIntent.clear()
}

onMounted(async () => {
  ensureLoaded()
  if (user.value) await refresh()
  if (route.query.upgrade === 'canceled') {
    sessionShown.value = true
  }
})
</script>
