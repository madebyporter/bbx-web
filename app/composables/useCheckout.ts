import { ref } from 'vue'
import { useAuthHeaders } from '~/composables/useAuthHeaders'
import { useToast } from '~/composables/useToast'
import type { BillingInterval } from '~/composables/usePlans'

export type CheckoutContext = 'signup' | 'pricing' | 'upgrade'

// Hosted Stripe Checkout (redirect) is intentional: simplest/safest, supports
// Apple Pay / Google Pay / Link. Embedded Checkout (ui_mode: 'embedded' with
// @stripe/stripe-js in our modal) can come later if we want in-app payment UI.

const redirecting = ref(false)

function isBillingEnabled(): boolean {
  const config = useRuntimeConfig()
  return String(config.public.billingEnabled) === 'true'
}

export function useCheckout() {
  const { showInfo, showError } = useToast()

  async function startCheckout(opts: {
    plan: string
    interval: BillingInterval
    context: CheckoutContext
  }): Promise<boolean> {
    if (!isBillingEnabled()) {
      showInfo("Payments are coming soon. You're on Free for now.")
      await navigateTo('/')
      return false
    }

    redirecting.value = true
    try {
      const headers = await useAuthHeaders()
      if (!headers.Authorization) {
        showError("Couldn't open checkout. Sign in and try again.")
        return false
      }

      const res = await $fetch<{ url: string }>('/api/billing/checkout', {
        method: 'POST',
        headers,
        body: {
          planSlug: opts.plan,
          interval: opts.interval,
          context: opts.context,
          returnOrigin: window.location.origin,
        },
      })

      if (!res?.url) {
        throw new Error('Missing checkout URL')
      }

      window.location.assign(res.url)
      return true
    } catch (err) {
      console.error(err)
      showError("Couldn't open checkout. You're on Free for now; you can upgrade anytime.")
      return false
    } finally {
      // Keep redirecting true briefly so UI can show the loading state until navigation
      setTimeout(() => {
        redirecting.value = false
      }, 2000)
    }
  }

  async function openPortal(): Promise<boolean> {
    if (!isBillingEnabled()) {
      showInfo("Payments are coming soon. You're on Free for now.")
      return false
    }

    redirecting.value = true
    try {
      const headers = await useAuthHeaders()
      if (!headers.Authorization) {
        showError("Couldn't open billing. Sign in and try again.")
        return false
      }

      const res = await $fetch<{ url: string }>('/api/billing/portal', {
        method: 'POST',
        headers,
        body: { returnOrigin: window.location.origin },
      })

      if (!res?.url) {
        throw new Error('Missing portal URL')
      }

      window.location.assign(res.url)
      return true
    } catch (err) {
      console.error(err)
      showError("Couldn't open billing portal. Try again in a moment.")
      return false
    } finally {
      setTimeout(() => {
        redirecting.value = false
      }, 2000)
    }
  }

  return {
    redirecting,
    startCheckout,
    openPortal,
    isBillingEnabled,
  }
}
