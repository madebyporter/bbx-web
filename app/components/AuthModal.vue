<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      @click.self="onBackdrop"
    >
      <div
        ref="panelRef"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="headingId"
        class="relative bg-neutral-900 text-neutral-200 ring-1 ring-neutral-800 overflow-hidden
          max-md:inset-0 max-md:fixed max-md:h-[100dvh] max-md:w-full max-md:rounded-none
          md:w-[90vw] md:h-[90vh] md:rounded-lg md:max-w-6xl"
      >
        <div class="grid h-full lg:grid-cols-2">
          <div class="flex flex-col gap-4 h-full min-h-0 overflow-y-auto p-4 sm:p-8">
            <div class="flex flex-row items-center justify-between gap-2">
              <div class="flex flex-row items-center gap-2">
                <img src="~/assets/img/bbx-logo.svg" alt="Beatbox" class="size-10" width="40" height="40" />
                <span class="text-lg font-semibold text-white">Beatbox</span>
              </div>
              <div
                role="button"
                tabindex="0"
                class="p-2 cursor-pointer"
                :class="isSubmitting || checkout.redirecting.value ? 'pointer-events-none opacity-50' : ''"
                aria-label="Close"
                @click="close"
                @keydown.enter.prevent="close"
                @keydown.space.prevent="close"
              >
                <Xmark class="size-5 text-white" />
              </div>
            </div>

            <div aria-live="polite" class="sr-only">{{ liveMessage }}</div>

            <!-- Checkout redirect state -->
            <div v-if="checkout.redirecting.value" class="flex flex-1 flex-col justify-center gap-3">
              <h2 :id="headingId" class="text-xl font-bold">Taking you to secure checkout...</h2>
              <p class="text-sm text-neutral-400">
                Hang tight. Stripe will open in this window.
              </p>
            </div>

            <!-- Plan step -->
            <div v-else-if="step === 'plan'" class="flex flex-1 flex-col justify-center gap-4">
              <div>
                <h2 :id="headingId" class="text-xl font-bold" tabindex="-1">Choose your plan</h2>
                <p class="mt-1 text-sm text-neutral-400">Pick Free or Pro. You can change later.</p>
              </div>
              <PricingPlans
                compact
                source="auth_modal"
                :selected-slug="signupIntent.intent.value?.plan"
                @select="onPlanPicked"
              />
              <p class="text-sm text-neutral-400">
                Already have an account?
                <button type="button" class="text-link no-underline ml-1" @click="goSignIn">
                  Sign in
                </button>
              </p>
            </div>

            <!-- Signup / Sign in / Forgot -->
            <div v-else class="flex justify-center flex-1 flex-col gap-4">
              <h2 :id="headingId" class="text-xl font-bold" tabindex="-1">
                {{ headingText }}
              </h2>

              <div
                v-if="step === 'signup' && planSummary"
                class="flex items-center justify-between gap-2 rounded-md border border-neutral-800 bg-neutral-800/50 px-3 py-2 text-sm"
              >
                <span class="text-neutral-200">{{ planSummary }}</span>
                <button
                  type="button"
                  class="text-link no-underline text-xs"
                  @click="goPlanStep"
                >
                  Change
                </button>
              </div>

              <div
                v-if="authError === 'unconfirmed'"
                class="p-3 rounded bg-amber-500/10 border border-amber-500/30 text-sm text-neutral-300"
              >
                <p class="mb-2" id="auth-error-desc">{{ authErrorMessage }}</p>
                <button
                  type="button"
                  class="text-link no-underline mr-3"
                  :disabled="isResendingConfirmation"
                  @click="handleResendFromModal"
                >
                  {{ isResendingConfirmation ? 'Sending...' : 'Resend confirmation email' }}
                </button>
                <NuxtLink
                  to="/auth/check-email"
                  class="text-link no-underline"
                  @click="prepareCheckEmailNavigation"
                >
                  Check email instructions
                </NuxtLink>
              </div>

              <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
                <div class="flex flex-col gap-2">
                  <label for="auth-email" class="block text-sm font-medium">Email</label>
                  <input
                    id="auth-email"
                    v-model="email"
                    type="email"
                    required
                    data-autofocus
                    :aria-describedby="authError === 'unconfirmed' ? 'auth-error-desc' : undefined"
                    class="w-full p-2 rounded bg-neutral-800 border border-neutral-700 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div class="flex flex-col gap-2" v-if="step !== 'forgot'">
                  <label for="auth-password" class="block text-sm font-medium">Password</label>
                  <input
                    id="auth-password"
                    v-model="password"
                    type="password"
                    required
                    class="w-full p-2 rounded bg-neutral-800 border border-neutral-700 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div class="flex flex-col gap-2" v-if="step === 'signup'">
                  <label for="auth-user-type" class="block text-sm font-medium">I am a</label>
                  <select
                    id="auth-user-type"
                    v-model="userType"
                    required
                    class="w-full p-2 rounded bg-neutral-800 border border-neutral-700 focus:outline-none focus:border-amber-500"
                  >
                    <option value="creator">Creator (content creator, songwriter, music artist)</option>
                    <option value="audio_pro">Audio Pro (producer, engineer, etc.)</option>
                  </select>
                </div>
                <div v-if="step === 'forgot'" class="text-sm text-neutral-400">
                  Enter your email address and we'll send you a link to reset your password.
                </div>
                <div v-if="step === 'signin'" class="flex justify-end">
                  <button type="button" class="text-link text-xs no-underline" @click="showForgotPassword">
                    Forgot password?
                  </button>
                </div>
                <div class="flex flex-col gap-4">
                  <div class="flex flex-col md:flex-row justify-between items-center gap-2">
                    <Button class="w-full" type="submit" :disabled="isSubmitting">
                      <span v-if="isSubmitting">
                        {{
                          step === 'forgot'
                            ? 'Sending...'
                            : step === 'signup'
                              ? 'Signing up...'
                              : 'Signing in...'
                        }}
                      </span>
                      <span v-else>{{ submitLabel }}</span>
                    </Button>
                    <Button
                      v-if="step === 'forgot'"
                      type="button"
                      variant="ghost"
                      class="w-full"
                      @click="goSignIn"
                    >
                      Back to Sign In
                    </Button>
                    <Button
                      v-else-if="step === 'signin'"
                      type="button"
                      variant="ghost"
                      class="w-full"
                      @click="goPlanStep"
                    >
                      Don't have an account?
                    </Button>
                    <Button
                      v-else
                      type="button"
                      variant="ghost"
                      class="w-full"
                      @click="goSignIn"
                    >
                      Already have an account?
                    </Button>
                  </div>
                  <p v-if="step === 'signup' && isPaidIntent" class="text-xs text-neutral-500">
                    You'll create your account first, then pay securely with Stripe. If you stop at checkout, you'll still have a free account.
                  </p>
                </div>
              </form>
            </div>
          </div>

          <div
            v-if="showImageColumn"
            class="relative hidden lg:block h-full min-h-0 bg-neutral-950"
            aria-hidden="false"
          >
            <picture class="absolute inset-0 block h-full w-full">
              <source :srcset="studioWebp" type="image/webp" />
              <img
                :src="studioJpg"
                alt="A dimly lit music studio with a mixing console and studio monitors."
                class="h-full w-full object-cover"
                width="1400"
                height="933"
              />
            </picture>
            <div class="absolute inset-0 bg-gradient-to-t from-neutral-950/80 via-neutral-950/20 to-transparent" />
            <p class="absolute bottom-8 left-8 right-8 text-sm text-neutral-200">
              Every bounce, version, and client in one place.
            </p>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { Xmark } from '@iconoir/vue'
import { useAuth, isEmailNotConfirmedError } from '~/composables/useAuth'
import { useAnalytics } from '~/composables/useAnalytics'
import { useToast } from '~/composables/useToast'
import { useFocusTrap } from '~/composables/useFocusTrap'
import { usePlans, type BillingInterval } from '~/composables/usePlans'
import { useSignupIntent } from '~/composables/useSignupIntent'
import { useCheckout } from '~/composables/useCheckout'
import {
  markSignupConfirmationSent,
  setPendingSignupEmail,
  shouldSkipDuplicateSignup,
} from '~/utils/authStorage'
import type { AuthModalStep } from '~/types/analytics'
import studioWebp from '~/assets/img/auth/studio.webp'
import studioJpg from '~/assets/img/auth/studio.jpg'

export type AuthModalMode = 'signin' | 'signup' | 'forgot'
export type AuthModalOpts = {
  plan?: string
  interval?: BillingInterval
  source?: string
}

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [boolean]
}>()

const auth = useAuth()
const { capture } = useAnalytics()
const { showSuccess, showError, showInfo } = useToast()
const { findPlan, formatPrice, ensureLoaded } = usePlans()
const signupIntent = useSignupIntent()
const checkout = useCheckout()

const isOpen = computed(() => props.open)
const panelRef = ref<HTMLElement | null>(null)
useFocusTrap(panelRef, isOpen)

const step = ref<AuthModalStep>('signin')
const email = ref('')
const password = ref('')
const userType = ref<'creator' | 'audio_pro'>('creator')
const authError = ref<'unconfirmed' | null>(null)
const authErrorMessage = ref('')
const isResendingConfirmation = ref(false)
const isSubmitting = ref(false)
const liveMessage = ref('')
const headingId = 'auth-modal-heading'
const showImageColumn = ref(false)

const isPaidIntent = computed(() => signupIntent.isPaid.value)

const headingText = computed(() => {
  if (step.value === 'forgot') return 'Reset Password'
  if (step.value === 'signup') return 'Sign Up'
  return 'Sign In'
})

const planSummary = computed(() => {
  const intent = signupIntent.intent.value
  if (!intent) return ''
  const plan = findPlan(intent.plan)
  if (!plan) return ''
  if (plan.is_default) return 'Free'
  return `${plan.name}, ${formatPrice(plan, intent.interval)} a ${intent.interval === 'year' ? 'year' : 'month'}`
})

const submitLabel = computed(() => {
  if (step.value === 'forgot') return 'Send Reset Link'
  if (step.value === 'signin') return 'Sign In'
  if (isPaidIntent.value) return 'Continue to payment'
  return 'Create free account'
})

function clearAuthError() {
  authError.value = null
  authErrorMessage.value = ''
}

function setStep(next: AuthModalStep) {
  step.value = next
  liveMessage.value = headingText.value
  capture('auth_modal_step_viewed', { step: next })
  nextTick(() => {
    const heading = panelRef.value?.querySelector<HTMLElement>(`#${headingId}`)
    heading?.focus()
  })
}

function close() {
  if (isSubmitting.value || checkout.redirecting.value) return
  emit('update:open', false)
}

function onBackdrop() {
  close()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') close()
}

function lockBody(lock: boolean) {
  if (!import.meta.client) return
  document.body.style.overflow = lock ? 'hidden' : ''
}

function goSignIn() {
  clearAuthError()
  setStep('signin')
}

function goPlanStep() {
  clearAuthError()
  setStep('plan')
}

function showForgotPassword() {
  clearAuthError()
  setStep('forgot')
}

async function onPlanPicked(payload: { plan: string; interval: BillingInterval }) {
  await signupIntent.set({
    plan: payload.plan,
    interval: payload.interval,
    source: signupIntent.intent.value?.source || 'auth_modal',
  })
  setStep('signup')
}

function prepareCheckEmailNavigation() {
  if (email.value) setPendingSignupEmail(email.value)
  emit('update:open', false)
  clearAuthError()
}

async function handleResendFromModal() {
  if (!email.value || isResendingConfirmation.value) return
  isResendingConfirmation.value = true
  try {
    await auth.resendConfirmation(
      email.value,
      signupIntent.isPaid.value ? signupIntent.toQuery() : undefined,
    )
    showInfo('Confirmation email sent. Check your inbox.', 8000)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Could not resend email'
    showError(message)
  } finally {
    isResendingConfirmation.value = false
  }
}

async function handleSubmit() {
  if (isSubmitting.value) return
  clearAuthError()
  isSubmitting.value = true
  try {
    if (step.value === 'forgot') {
      await auth.resetPassword(email.value)
      showInfo(
        'Password reset email sent! Please check your inbox and follow the link to reset your password.',
        8000,
      )
      emit('update:open', false)
      email.value = ''
      password.value = ''
      setStep('signin')
      return
    }

    if (step.value === 'signup') {
      const signupEmail = email.value
      const signupUserType = userType.value
      const intent = signupIntent.intent.value
      const paid = signupIntent.isPaid.value
      const redirectQuery = paid && intent ? signupIntent.toQuery() : undefined

      if (shouldSkipDuplicateSignup(signupEmail)) {
        setPendingSignupEmail(signupEmail)
        emit('update:open', false)
        email.value = ''
        password.value = ''
        userType.value = 'creator'
        await navigateTo({
          path: '/auth/check-email',
          query: redirectQuery || {},
        })
        return
      }

      capture('signup_started', {
        user_type: signupUserType,
        plan: intent?.plan,
        interval: intent?.interval,
      })

      const result = await auth.signUp(signupEmail, password.value, signupUserType, redirectQuery)
      capture('signup_completed', {
        user_type: signupUserType,
        method: 'email',
        plan: intent?.plan,
        interval: intent?.interval,
      })

      if (result.user && !result.session) {
        setPendingSignupEmail(signupEmail)
        markSignupConfirmationSent(signupEmail)
        emit('update:open', false)
        email.value = ''
        password.value = ''
        userType.value = 'creator'
        await navigateTo({
          path: '/auth/check-email',
          query: redirectQuery || {},
        })
        return
      }

      // Immediate session
      if (paid && intent) {
        email.value = ''
        password.value = ''
        userType.value = 'creator'
        capture('checkout_started', {
          plan: intent.plan,
          interval: intent.interval,
          context: 'signup',
        })
        await checkout.startCheckout({
          plan: intent.plan,
          interval: intent.interval,
          context: 'signup',
        })
        return
      }

      signupIntent.clear()
      showSuccess('Account created successfully!')
      emit('update:open', false)
      email.value = ''
      password.value = ''
      userType.value = 'creator'
      return
    }

    // Sign in
    const signInEmail = email.value
    await auth.signIn(signInEmail, password.value)
    capture('login_completed', {})
    showSuccess(`Welcome back, ${signInEmail}!`)
    emit('update:open', false)
    email.value = ''
    password.value = ''

    if (typeof window !== 'undefined') {
      const redirect = sessionStorage.getItem('auth_redirect')
      if (redirect) {
        sessionStorage.removeItem('auth_redirect')
        await navigateTo(redirect)
        return
      }
    }

    // Paid intent after sign-in (confirm on another device)
    if (signupIntent.isPaid.value && signupIntent.intent.value) {
      const intent = signupIntent.intent.value
      capture('checkout_started', {
        plan: intent.plan,
        interval: intent.interval,
        context: 'signup',
      })
      await checkout.startCheckout({
        plan: intent.plan,
        interval: intent.interval,
        context: 'signup',
      })
    }
  } catch (error: unknown) {
    console.error('Auth error:', error)
    if (isEmailNotConfirmedError(error)) {
      authError.value = 'unconfirmed'
      authErrorMessage.value =
        error instanceof Error ? error.message : 'Please confirm your email before signing in.'
      return
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    showError(`Authentication failed: ${errorMessage}`)
  } finally {
    isSubmitting.value = false
  }
}

/**
 * Public opener used by layout provide.
 */
async function openModal(mode: AuthModalMode = 'signin', opts?: AuthModalOpts) {
  await ensureLoaded()
  clearAuthError()
  email.value = ''
  password.value = ''

  if (mode === 'forgot') {
    setStep('forgot')
    emit('update:open', true)
    return
  }

  if (mode === 'signin') {
    if (opts?.plan) {
      await signupIntent.set({
        plan: opts.plan,
        interval: opts.interval || 'month',
        source: opts.source || 'query',
      })
    }
    setStep('signin')
    emit('update:open', true)
    return
  }

  // signup
  const source = opts?.source || 'auth_modal'
  if (opts?.plan) {
    const plan = findPlan(opts.plan)
    if (plan) {
      await signupIntent.set({
        plan: plan.slug,
        interval: opts.interval || 'month',
        source,
      })
      setStep('signup')
      capture('signup_started', {
        user_type: userType.value,
        plan: plan.slug,
        interval: opts.interval || 'month',
      })
      emit('update:open', true)
      return
    }
  }

  // No valid plan (missing, unknown, or hidden like studio): plan step
  setStep('plan')
  emit('update:open', true)
}

watch(
  () => props.open,
  (isOpen) => {
    lockBody(isOpen)
    showImageColumn.value = isOpen
    if (isOpen) {
      document.addEventListener('keydown', onKeydown)
    } else {
      document.removeEventListener('keydown', onKeydown)
    }
  },
)

onMounted(() => {
  void ensureLoaded()
})

onUnmounted(() => {
  lockBody(false)
  document.removeEventListener('keydown', onKeydown)
})

defineExpose({ open: openModal, close })
</script>
