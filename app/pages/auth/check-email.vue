<template>
  <div class="grow bg-neutral-900 flex items-center justify-center">
    <div class="bg-neutral-800 p-8 rounded-lg max-w-md w-full mx-4">
      <!-- Confirmed: session exists and email is verified -->
      <div v-if="isConfirmed" class="text-center">
        <div class="text-green-500 text-4xl mb-4" aria-hidden="true">✓</div>
        <h1 class="text-xl font-bold text-neutral-200 mb-2">Email confirmed</h1>
        <p class="text-neutral-400 mb-6">
          You're all set
          <template v-if="displayEmail">
            as <span class="text-neutral-200 font-medium">{{ displayEmail }}</span>
          </template>
          . Continue to your library to get started.
        </p>

        <p v-if="paidPlanName" class="text-sm text-amber-400/90 mb-4">
          Next up: checkout for {{ paidPlanName }}.
        </p>

        <Button
          variant="primary"
          full-width
          class="mb-3"
          :disabled="isContinuing"
          @click="continueAfterConfirm"
        >
          <span v-if="isContinuing">Taking you there...</span>
          <span v-else-if="paidPlanName">Continue to checkout</span>
          <span v-else>Continue to library</span>
        </Button>
      </div>

      <!-- Waiting for confirmation -->
      <div v-else class="text-center">
        <div class="text-amber-500 text-4xl mb-4" aria-hidden="true">✉</div>
        <h1 class="text-xl font-bold text-neutral-200 mb-2">Check your inbox</h1>
        <p v-if="displayEmail" class="text-neutral-400 mb-4">
          We sent a confirmation link to
          <span class="text-neutral-200 font-medium">{{ displayEmail }}</span>
          from <span class="text-neutral-200">Beatbox Studio</span>.
        </p>
        <p v-else class="text-neutral-400 mb-4">
          We sent a confirmation link from <span class="text-neutral-200">Beatbox Studio</span>.
          Open the email and click the link to activate your account.
        </p>

        <p v-if="paidPlanName" class="text-sm text-amber-400/90 mb-4">
          After you confirm, we'll take you to checkout for {{ paidPlanName }}.
        </p>

        <ul class="text-sm text-neutral-500 text-left space-y-2 mb-6 list-disc pl-5">
          <li>It may take a few minutes to arrive.</li>
          <li>Check spam, junk, or promotions if you do not see it.</li>
          <li>The link expires after about an hour.</li>
          <li>Already confirmed? This page updates when you're signed in.</li>
        </ul>

        <p v-if="resendMessage" class="text-sm mb-4" :class="resendError ? 'text-red-400' : 'text-green-400'">
          {{ resendMessage }}
        </p>

        <Button
          variant="primary"
          full-width
          class="mb-3"
          :disabled="isResending || cooldownSeconds > 0 || !displayEmail"
          @click="handleResend"
        >
          <span v-if="isResending">Sending...</span>
          <span v-else-if="cooldownSeconds > 0">Resend available in {{ cooldownSeconds }}s</span>
          <span v-else>Resend confirmation email</span>
        </Button>

        <Button variant="secondary" full-width class="mb-3" @click="goHome">
          Back to Beatbox
        </Button>

        <button type="button" class="text-link text-sm no-underline" @click="tryDifferentEmail">
          Wrong email? Sign up again
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useSignupIntent } from '~/composables/useSignupIntent'
import { usePlans } from '~/composables/usePlans'
import { useCheckout } from '~/composables/useCheckout'
import { useAnalytics } from '~/composables/useAnalytics'
import { useSupabase } from '~/utils/supabase'
import {
  getPendingSignupEmail,
  clearPendingSignupEmail,
  PENDING_USER_TYPE_KEY,
} from '~/utils/authStorage'
import { ensureUserProfile } from '~/utils/ensureUserProfile'
import type { AuthUser } from '~/types/auth'

const auth = useAuth()
const { user, isReady, init } = auth
const { supabase } = useSupabase()
const route = useRoute()
const signupIntent = useSignupIntent()
const { findPlan, ensureLoaded } = usePlans()
const { startCheckout } = useCheckout()
const { capture } = useAnalytics()

const displayEmail = ref('')
const isResending = ref(false)
const isContinuing = ref(false)
const resendMessage = ref('')
const resendError = ref(false)
const cooldownSeconds = ref(0)
let cooldownTimer: ReturnType<typeof setInterval> | null = null
let pollTimer: ReturnType<typeof setInterval> | null = null

const paidPlanName = computed(() => {
  if (!signupIntent.isPaid.value || !signupIntent.intent.value) return ''
  return findPlan(signupIntent.intent.value.plan)?.name || ''
})

function isEmailConfirmed(u: AuthUser | null | undefined): boolean {
  if (!u) return false
  const anyUser = u as AuthUser & { email_confirmed_at?: string | null; confirmed_at?: string | null }
  return !!(anyUser.email_confirmed_at || anyUser.confirmed_at)
}

const isConfirmed = computed(() => {
  return isReady.value && !!user.value && isEmailConfirmed(user.value)
})

const startCooldown = (seconds = 60) => {
  cooldownSeconds.value = seconds
  if (cooldownTimer) clearInterval(cooldownTimer)
  cooldownTimer = setInterval(() => {
    if (cooldownSeconds.value <= 1) {
      cooldownSeconds.value = 0
      if (cooldownTimer) {
        clearInterval(cooldownTimer)
        cooldownTimer = null
      }
    } else {
      cooldownSeconds.value -= 1
    }
  }, 1000)
}

async function refreshSessionFromServer() {
  if (!supabase) return
  try {
    const { data } = await supabase.auth.getUser()
    if (data.user && isEmailConfirmed(data.user as AuthUser)) {
      // getUser refreshes from Auth API; sync local auth state via getSession
      await supabase.auth.getSession()
      if (data.user.email) {
        displayEmail.value = data.user.email
      }
      clearPendingSignupEmail()
    }
  } catch (err) {
    console.error('Failed to refresh auth user on check-email:', err)
  }
}

async function resolveLibraryPath(): Promise<string> {
  if (!user.value || !supabase) return '/'
  try {
    const pendingType =
      typeof window !== 'undefined'
        ? (localStorage.getItem(PENDING_USER_TYPE_KEY) as 'creator' | 'audio_pro' | null)
        : null
    const profile = await ensureUserProfile(supabase, user.value, pendingType || undefined)
    if (profile?.username) return `/u/${profile.username}`
  } catch (err) {
    console.error('Failed to ensure profile before library redirect:', err)
  }
  return '/'
}

async function continueAfterConfirm() {
  if (isContinuing.value) return
  isContinuing.value = true
  clearPendingSignupEmail()

  try {
    if (signupIntent.isPaid.value && signupIntent.intent.value) {
      const intent = signupIntent.intent.value
      capture('checkout_started', {
        plan: intent.plan,
        interval: intent.interval,
        context: 'signup',
        plan_slug: intent.plan,
      })
      await startCheckout({
        plan: intent.plan,
        interval: intent.interval,
        context: 'signup',
      })
      return
    }

    const path = await resolveLibraryPath()
    await navigateTo(path)
  } finally {
    isContinuing.value = false
  }
}

watch(isConfirmed, (confirmed) => {
  if (confirmed) {
    clearPendingSignupEmail()
    if (user.value?.email) {
      displayEmail.value = user.value.email
    }
  }
})

onMounted(async () => {
  await init()
  await ensureLoaded()
  await signupIntent.readFromQuery(route)
  const fromStorage = getPendingSignupEmail()
  const fromQuery = typeof route.query.email === 'string' ? route.query.email : ''
  displayEmail.value = fromStorage || fromQuery || user.value?.email || ''

  await refreshSessionFromServer()

  // Poll while waiting — catches confirm-in-another-tab / delayed session
  pollTimer = setInterval(() => {
    if (isConfirmed.value) {
      if (pollTimer) {
        clearInterval(pollTimer)
        pollTimer = null
      }
      return
    }
    void refreshSessionFromServer()
  }, 4000)
})

onUnmounted(() => {
  if (cooldownTimer) clearInterval(cooldownTimer)
  if (pollTimer) clearInterval(pollTimer)
})

const handleResend = async () => {
  if (!displayEmail.value || isResending.value || cooldownSeconds.value > 0) return
  isResending.value = true
  resendMessage.value = ''
  resendError.value = false
  try {
    await auth.resendConfirmation(
      displayEmail.value,
      signupIntent.isPaid.value ? signupIntent.toQuery() : undefined,
    )
    resendMessage.value = 'Confirmation email sent. Check your inbox.'
    resendError.value = false
    startCooldown(60)
  } catch (error: unknown) {
    resendError.value = true
    const message = error instanceof Error ? error.message : 'Could not resend email'
    // Already confirmed — refresh and flip UI
    if (
      message.toLowerCase().includes('already') ||
      message.toLowerCase().includes('confirmed')
    ) {
      await refreshSessionFromServer()
      if (isConfirmed.value) {
        resendError.value = false
        resendMessage.value = ''
        return
      }
    }
    if (message.toLowerCase().includes('rate') || message.toLowerCase().includes('seconds')) {
      resendMessage.value = 'Please wait a minute before requesting another email.'
      startCooldown(60)
    } else {
      resendMessage.value = message
    }
  } finally {
    isResending.value = false
  }
}

const goHome = () => {
  navigateTo('/')
}

const tryDifferentEmail = () => {
  clearPendingSignupEmail()
  const q = signupIntent.toQuery()
  navigateTo({ path: '/', query: { auth: 'signup', ...q } })
}
</script>
