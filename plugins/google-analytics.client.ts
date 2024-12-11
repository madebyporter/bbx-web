export default defineNuxtPlugin((nuxtApp) => {
  const MEASUREMENT_ID = 'G-880GG6FBWS'

  function initGoogleAnalytics() {
    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`
    document.head.appendChild(script)

    window.dataLayer = window.dataLayer || []
    function gtag(...args: any[]) {
      window.dataLayer.push(arguments)
    }
    gtag('js', new Date())
    gtag('config', MEASUREMENT_ID)

    // Make gtag available globally
    window.gtag = gtag
  }

  // Only run on client-side
  if (typeof window !== 'undefined') {
    nuxtApp.hook('app:mounted', () => {
      initGoogleAnalytics()
    })
  }
}) 