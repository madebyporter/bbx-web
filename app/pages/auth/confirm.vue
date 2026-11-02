<template>
  <div class="grow bg-neutral-900 flex items-center justify-center">
    <div class="bg-neutral-800 p-8 rounded-lg max-w-md w-full mx-4">
      <div v-if="isLoading" class="text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto mb-4"></div>
        <h2 class="text-xl font-bold text-neutral-200 mb-2">Confirming your email...</h2>
        <p class="text-neutral-400">Please wait while we confirm your email address.</p>
      </div>

      <div v-else-if="isSuccess" class="text-center">
        <div class="text-green-500 text-4xl mb-4">✓</div>
        <h2 class="text-xl font-bold text-neutral-200 mb-2">Email Confirmed!</h2>
        <p class="text-neutral-400 mb-4">
          <template v-if="paidPlanName && isSignedIn">
            Email confirmed. Next, let's set up your {{ paidPlanName }} plan.
          </template>
          <template v-else-if="isSignedIn">
            You're all set. Welcome to Beatbox Studio.
          </template>
          <template v-else>
            Your email has been successfully confirmed. You can now sign in to your account.
          </template>
        </p>

        <div v-if="paidPlanName && isSignedIn" class="flex flex-col gap-3 items-center">
          <Button :disabled="checkoutBusy" @click="goToCheckout">
            {{ checkoutBusy ? 'Taking you to secure checkout...' : 'Continue to checkout' }}
          </Button>
          <button type="button" class="text-link text-xs text-neutral-500 no-underline" @click="skipPaid">
            Skip for now, stay on Free
          </button>
        </div>
        <Button v-else @click="finishConfirmation">
          {{ isSignedIn ? 'Continue to Beatbox' : 'Sign In' }}
        </Button>
      </div>

      <div v-else-if="isError" class="text-center">
        <div class="text-red-500 text-4xl mb-4">✗</div>
        <h2 class="text-xl font-bold text-neutral-200 mb-2">Confirmation Failed</h2>
        <p class="text-neutral-400 mb-4">{{ errorMessage }}</p>
        <Button variant="secondary" @click="finishConfirmation">
          Try Again
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useAuth } from '~/composables/useAuth'
import { useAnalytics } from '~/composables/useAnalytics'
import { useSupabase } from '~/utils/supabase'
import { PENDING_USER_TYPE_KEY, clearPendingSignupEmail } from '~/utils/authStorage'
import { syncResendContact } from '~/utils/resendContactSync'
import { useSignupIntent } from '~/composables/useSignupIntent'
import { usePlans } from '~/composables/usePlans'
import { useCheckout } from '~/composables/useCheckout'

const auth = useAuth()
const { supabase } = useSupabase()
const { capture } = useAnalytics()
const route = useRoute()
const signupIntent = useSignupIntent()
const { findPlan, ensureLoaded } = usePlans()
const { startCheckout } = useCheckout()

const isLoading = ref(true)
const isSuccess = ref(false)
const isError = ref(false)
const isSignedIn = ref(false)
const errorMessage = ref('')
const checkoutBusy = ref(false)
let autoCheckoutTimer: ReturnType<typeof setTimeout> | null = null

const paidPlanName = computed(() => {
  if (!signupIntent.isPaid.value || !signupIntent.intent.value) return ''
  return findPlan(signupIntent.intent.value.plan)?.name || ''
})

const setSignedInFromSession = (hasSession: boolean) => {
  isSignedIn.value = hasSession
  if (hasSession) {
    clearPendingSignupEmail()
  }
}

async function goToCheckout() {
  const intent = signupIntent.intent.value
  if (!intent || checkoutBusy.value) return
  checkoutBusy.value = true
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
  checkoutBusy.value = false
}

function skipPaid() {
  signupIntent.clear()
  window.history.replaceState({}, document.title, '/')
  navigateTo('/')
}

const finishConfirmation = () => {
  const q = signupIntent.toQuery()
  if (isSignedIn.value) {
    window.history.replaceState({}, document.title, '/')
    navigateTo('/')
    return
  }
  navigateTo({
    path: '/',
    query: {
      auth: 'signin',
      ...q,
    },
  })
}

onMounted(async () => {
  await ensureLoaded()
  await signupIntent.readFromQuery(route)

  try {
    const urlParams = new URLSearchParams(window.location.search)
    const token = urlParams.get('token')
    const type = urlParams.get('type')

    if (token && type === 'signup') {
      const verifyResult = await supabase?.auth.verifyOtp({
        token_hash: token,
        type: 'signup',
      })
      const data = verifyResult?.data
      const error = verifyResult?.error

      if (error) throw error

      if (data?.session?.user && supabase) {
        const userType =
          (typeof window !== 'undefined' && localStorage.getItem(PENDING_USER_TYPE_KEY)) ||
          data.session.user.user_metadata?.user_type ||
          'creator'
        try {
          const username = data.session.user.email?.split('@')[0] || 'user'
          const { error: profileError } = await supabase
            .from('user_profiles')
            .upsert(
              {
                id: data.session.user.id,
                user_type: userType,
                username: username,
                display_name: username,
              },
              { onConflict: 'id' },
            )
            .select()

          if (profileError) {
            console.error('Error creating user profile:', profileError)
          } else if (typeof window !== 'undefined') {
            localStorage.removeItem(PENDING_USER_TYPE_KEY)
          }
        } catch (profileErr) {
          console.error('Error creating user profile:', profileErr)
        }

        setSignedInFromSession(!!data.session)
        isSuccess.value = true
        capture('email_confirmed', {})
        await syncResendContact(supabase, { source: 'confirm' })
      }
    } else {
      await auth.handleEmailConfirmation()
      const sessionResult = await supabase?.auth.getSession()
      const session = sessionResult?.data?.session

      if (session?.user && supabase) {
        const userType =
          (typeof window !== 'undefined' && localStorage.getItem(PENDING_USER_TYPE_KEY)) ||
          session.user.user_metadata?.user_type ||
          'creator'
        try {
          const { data: existingProfile } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('id', session.user.id)
            .single()

          if (!existingProfile) {
            const username = session.user.email?.split('@')[0] || 'user'
            const { error: profileError } = await supabase
              .from('user_profiles')
              .upsert(
                {
                  id: session.user.id,
                  user_type: userType,
                  username: username,
                  display_name: username,
                },
                { onConflict: 'id' },
              )
              .select()

            if (profileError) {
              console.error('Error creating user profile:', profileError)
            } else if (typeof window !== 'undefined') {
              localStorage.removeItem(PENDING_USER_TYPE_KEY)
            }
          } else if (userType) {
            const { error: updateError } = await supabase
              .from('user_profiles')
              .update({ user_type: userType })
              .eq('id', session.user.id)

            if (updateError) {
              console.error('Error updating user_type:', updateError)
            }
          }
        } catch (profileErr) {
          console.error('Error checking/creating user profile:', profileErr)
        }

        setSignedInFromSession(true)
        isSuccess.value = true
        capture('email_confirmed', {})
        await syncResendContact(supabase, { source: 'confirm' })
      } else if (signupIntent.isPaid.value) {
        // Confirmed on another device: still show success with Sign In keeping plan
        isSuccess.value = true
        setSignedInFromSession(false)
      } else {
        throw new Error('No valid confirmation token found')
      }
    }

    if (isSuccess.value && isSignedIn.value && signupIntent.isPaid.value) {
      autoCheckoutTimer = setTimeout(() => {
        void goToCheckout()
      }, 1500)
    }
  } catch (error: any) {
    console.error('Email confirmation error:', error)
    isError.value = true
    errorMessage.value = error.message || 'An error occurred while confirming your email'
  } finally {
    isLoading.value = false
  }
})

onUnmounted(() => {
  if (autoCheckoutTimer) clearTimeout(autoCheckoutTimer)
})
</script>
