<template>
  <div class="grow bg-neutral-900 flex items-center justify-center">
    <div class="bg-neutral-800 p-8 rounded-lg max-w-md w-full mx-4">
      <div class="text-center">
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

        <ul class="text-sm text-neutral-500 text-left space-y-2 mb-6 list-disc pl-5">
          <li>It may take a few minutes to arrive.</li>
          <li>Check spam, junk, or promotions if you do not see it.</li>
          <li>The link expires after about an hour.</li>
        </ul>

        <p v-if="resendMessage" class="text-sm mb-4" :class="resendError ? 'text-red-400' : 'text-green-400'">
          {{ resendMessage }}
        </p>

        <button
          type="button"
          :disabled="isResending || cooldownSeconds > 0 || !displayEmail"
          class="w-full bg-amber-500 text-black px-4 py-2 rounded hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-3"
          @click="handleResend"
        >
          <span v-if="isResending">Sending...</span>
          <span v-else-if="cooldownSeconds > 0">Resend available in {{ cooldownSeconds }}s</span>
          <span v-else>Resend confirmation email</span>
        </button>

        <button
          type="button"
          class="w-full bg-neutral-700 text-neutral-200 px-4 py-2 rounded hover:bg-neutral-600 transition-colors mb-3"
          @click="goHome"
        >
          Back to Beatbox
        </button>

        <button
          type="button"
          class="text-sm text-neutral-400 hover:text-neutral-300 underline"
          @click="tryDifferentEmail"
        >
          Wrong email? Sign up again
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuth } from '~/composables/useAuth'
import {
  getPendingSignupEmail,
  clearPendingSignupEmail
} from '~/utils/authStorage'

const auth = useAuth()
const route = useRoute()

const displayEmail = ref('')
const isResending = ref(false)
const resendMessage = ref('')
const resendError = ref(false)
const cooldownSeconds = ref(0)
let cooldownTimer: ReturnType<typeof setInterval> | null = null

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

onMounted(() => {
  const fromStorage = getPendingSignupEmail()
  const fromQuery = typeof route.query.email === 'string' ? route.query.email : ''
  displayEmail.value = fromStorage || fromQuery || ''
})

onUnmounted(() => {
  if (cooldownTimer) clearInterval(cooldownTimer)
})

const handleResend = async () => {
  if (!displayEmail.value || isResending.value || cooldownSeconds.value > 0) return
  isResending.value = true
  resendMessage.value = ''
  resendError.value = false
  try {
    await auth.resendConfirmation(displayEmail.value)
    resendMessage.value = 'Confirmation email sent. Check your inbox.'
    resendError.value = false
    startCooldown(60)
  } catch (error: unknown) {
    resendError.value = true
    const message = error instanceof Error ? error.message : 'Could not resend email'
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
  navigateTo('/?auth=signup')
}
</script>
