import type {
  AnalyticsEventName,
  AnalyticsEventProperties,
  AnalyticsUserType,
} from '~/types/analytics'

type EventProperties<T extends AnalyticsEventName> = AnalyticsEventProperties[T]

let posthogReady = false
let ga4MeasurementId: string | null = null

export function setPostHogReady(ready: boolean) {
  posthogReady = ready
}

export function setGa4Ready(measurementId: string) {
  ga4MeasurementId = measurementId
}

export function useAnalytics() {
  const config = useRuntimeConfig()
  const isEnabled = computed(
    () => Boolean(config.public.posthogKey) || Boolean(config.public.ga4MeasurementId)
  )

  const getPostHog = () => {
    if (!import.meta.client || !posthogReady) return null
    const nuxtApp = useNuxtApp()
    return nuxtApp.$posthog as typeof import('posthog-js').default | undefined
  }

  const getGa4 = () => {
    if (!import.meta.client || !ga4MeasurementId || typeof window.gtag !== 'function') {
      return null
    }

    return {
      gtag: window.gtag,
      measurementId: ga4MeasurementId,
    }
  }

  const capture = <T extends AnalyticsEventName>(
    event: T,
    properties?: EventProperties<T>
  ) => {
    if (!isEnabled.value) return

    const posthog = getPostHog()
    if (posthog) {
      posthog.capture(event, properties as Record<string, unknown>)
    }

    const ga4 = getGa4()
    if (ga4) {
      ga4.gtag('event', event, properties as Record<string, unknown>)
    }
  }

  const identify = (params: {
    userId: string
    userType?: AnalyticsUserType | null
    username?: string | null
    signupDate?: string | null
  }) => {
    if (!isEnabled.value) return

    const posthog = getPostHog()
    if (posthog) {
      const personProperties: Record<string, unknown> = {}
      if (params.userType) personProperties.user_type = params.userType
      if (params.username) personProperties.username = params.username
      if (params.signupDate) personProperties.signup_date = params.signupDate

      posthog.identify(params.userId, personProperties)
    }

    const ga4 = getGa4()
    if (ga4) {
      const userProperties: Record<string, unknown> = {}
      if (params.userType) userProperties.user_type = params.userType
      if (params.username) userProperties.username = params.username
      if (params.signupDate) userProperties.signup_date = params.signupDate

      ga4.gtag('config', ga4.measurementId, { user_id: params.userId })
      if (Object.keys(userProperties).length > 0) {
        ga4.gtag('set', 'user_properties', userProperties)
      }
    }
  }

  const reset = () => {
    if (!isEnabled.value) return

    const posthog = getPostHog()
    if (posthog) {
      posthog.reset()
    }

    const ga4 = getGa4()
    if (ga4) {
      ga4.gtag('config', ga4.measurementId, { user_id: null })
      ga4.gtag('set', 'user_properties', {})
    }
  }

  const capturePageView = (path: string, routeName?: string | null) => {
    if (!isEnabled.value) return

    const posthog = getPostHog()
    if (posthog) {
      posthog.capture('$pageview', {
        $current_url: typeof window !== 'undefined' ? window.location.href : path,
        path,
        route_name: routeName ?? undefined,
      })
    }

    const ga4 = getGa4()
    if (ga4) {
      ga4.gtag('event', 'page_view', {
        page_path: path,
        page_location: typeof window !== 'undefined' ? window.location.href : path,
        page_title: typeof document !== 'undefined' ? document.title : undefined,
        route_name: routeName ?? undefined,
      })
    }
  }

  return {
    isEnabled,
    capture,
    identify,
    reset,
    capturePageView,
  }
}
