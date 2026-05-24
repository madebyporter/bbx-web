import posthog from 'posthog-js'
import { useAuth } from '~/composables/useAuth'
import { setPostHogReady } from '~/composables/useAnalytics'
import { useSupabase } from '~/utils/supabase'
import type { AnalyticsUserType } from '~/types/analytics'

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()
  const apiKey = config.public.posthogKey as string | undefined
  const apiHost = (config.public.posthogHost as string | undefined) || 'https://us.i.posthog.com'

  if (!apiKey) {
    console.warn('[PostHog] NUXT_PUBLIC_POSTHOG_KEY is not set — analytics disabled')
    return
  }

  posthog.init(apiKey, {
    api_host: apiHost,
    capture_pageview: false,
    capture_pageleave: true,
    persistence: 'localStorage+cookie',
    person_profiles: 'identified_only',
  })

  nuxtApp.provide('posthog', posthog)
  setPostHogReady(true)

  const router = useRouter()
  const { capturePageView } = useAnalytics()

  router.afterEach((to) => {
    capturePageView(to.fullPath, String(to.name ?? ''))
  })

  // Initial pageview
  nuxtApp.hook('app:mounted', () => {
    const route = router.currentRoute.value
    capturePageView(route.fullPath, String(route.name ?? ''))
  })

  const auth = useAuth()
  const { supabase } = useSupabase()
  const { identify, reset } = useAnalytics()

  const syncUserIdentity = async (userId: string | null) => {
    if (!userId) {
      reset()
      return
    }

    let userType: AnalyticsUserType | null = null
    let username: string | null = null
    let signupDate: string | null = null

    if (supabase) {
      try {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('user_type, username, created_at')
          .eq('id', userId)
          .maybeSingle()

        if (profile?.user_type === 'creator' || profile?.user_type === 'audio_pro') {
          userType = profile.user_type
        }
        username = profile?.username ?? null
        signupDate = profile?.created_at ?? null
      } catch (error) {
        console.warn('[PostHog] Failed to load user profile for identify:', error)
      }
    }

    identify({
      userId,
      userType,
      username,
      signupDate,
    })
  }

  watch(
    () => auth.user.value?.id ?? null,
    (userId) => {
      void syncUserIdentity(userId)
    },
    { immediate: true }
  )

  // Re-identify after sign-in events
  nuxtApp.hook('app:mounted', async () => {
    await auth.init()
    if (auth.user.value?.id) {
      await syncUserIdentity(auth.user.value.id)
    }
  })

  if (supabase) {
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        void syncUserIdentity(session.user.id)
      }
      if (event === 'SIGNED_OUT') {
        reset()
      }
    })
  }
})
