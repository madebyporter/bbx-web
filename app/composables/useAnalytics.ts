import type {
  AnalyticsEventName,
  AnalyticsEventProperties,
  AnalyticsUserType,
} from '~/types/analytics'

type EventProperties<T extends AnalyticsEventName> = AnalyticsEventProperties[T]

let posthogReady = false

export function setPostHogReady(ready: boolean) {
  posthogReady = ready
}

export function useAnalytics() {
  const config = useRuntimeConfig()
  const isEnabled = computed(() => Boolean(config.public.posthogKey))

  const getPostHog = () => {
    if (!import.meta.client || !posthogReady) return null
    const nuxtApp = useNuxtApp()
    return nuxtApp.$posthog as typeof import('posthog-js').default | undefined
  }

  const capture = <T extends AnalyticsEventName>(
    event: T,
    properties?: EventProperties<T>
  ) => {
    if (!isEnabled.value) return

    const posthog = getPostHog()
    if (!posthog) return

    posthog.capture(event, properties as Record<string, unknown>)
  }

  const identify = (params: {
    userId: string
    userType?: AnalyticsUserType | null
    username?: string | null
    signupDate?: string | null
  }) => {
    if (!isEnabled.value) return

    const posthog = getPostHog()
    if (!posthog) return

    const personProperties: Record<string, unknown> = {}
    if (params.userType) personProperties.user_type = params.userType
    if (params.username) personProperties.username = params.username
    if (params.signupDate) personProperties.signup_date = params.signupDate

    posthog.identify(params.userId, personProperties)
  }

  const reset = () => {
    if (!isEnabled.value) return

    const posthog = getPostHog()
    if (!posthog) return

    posthog.reset()
  }

  const capturePageView = (path: string, routeName?: string | null) => {
    if (!isEnabled.value) return

    const posthog = getPostHog()
    if (!posthog) return

    posthog.capture('$pageview', {
      $current_url: typeof window !== 'undefined' ? window.location.href : path,
      path,
      route_name: routeName ?? undefined,
    })
  }

  return {
    isEnabled,
    capture,
    identify,
    reset,
    capturePageView,
  }
}
