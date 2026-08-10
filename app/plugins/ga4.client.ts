import { setGa4Ready } from '~/composables/useAnalytics'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const measurementId = config.public.ga4MeasurementId as string | undefined

  if (!measurementId) {
    return
  }

  window.dataLayer = window.dataLayer || []
  // gtag.js only processes queue entries that are Arguments objects (not Arrays).
  // Rest-parameter arrays are ignored, so config/page_view never reach GA4.
  window.gtag = function gtag(..._args: unknown[]) {
    window.dataLayer.push(arguments)
  }

  window.gtag('js', new Date())
  window.gtag('config', measurementId, { send_page_view: false })

  useHead({
    script: [
      {
        src: `https://www.googletagmanager.com/gtag/js?id=${measurementId}`,
        async: true,
      },
    ],
  })

  setGa4Ready(measurementId)
})
